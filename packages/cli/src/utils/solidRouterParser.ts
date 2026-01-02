import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { parse } from "@babel/parser"
import {
	type ParsedRoute,
	type ParseResult,
	resolveImportPath,
} from "./routeParserUtils.js"

// Re-export shared types
export type { ParsedRoute, ParseResult }

/**
 * Parse Solid Router configuration file and extract routes
 */
export function parseSolidRouterConfig(
	filePath: string,
	preloadedContent?: string,
): ParseResult {
	const absolutePath = resolve(filePath)
	const routesFileDir = dirname(absolutePath)
	const warnings: string[] = []

	// Read file with proper error handling (skip if content is preloaded)
	let content: string
	if (preloadedContent !== undefined) {
		content = preloadedContent
	} else {
		try {
			content = readFileSync(absolutePath, "utf-8")
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			throw new Error(
				`Failed to read routes file "${absolutePath}": ${message}`,
			)
		}
	}

	// Parse with Babel - wrap for better error messages
	let ast: ReturnType<typeof parse>
	try {
		ast = parse(content, {
			sourceType: "module",
			plugins: ["typescript", "jsx"],
		})
	} catch (error) {
		if (error instanceof SyntaxError) {
			throw new Error(
				`Syntax error in routes file "${absolutePath}": ${error.message}`,
			)
		}
		const message = error instanceof Error ? error.message : String(error)
		throw new Error(`Failed to parse routes file "${absolutePath}": ${message}`)
	}

	const routes: ParsedRoute[] = []

	// Find routes array in the AST
	for (const node of ast.program.body) {
		// Handle: const routes = [...]
		if (node.type === "VariableDeclaration") {
			for (const decl of node.declarations) {
				if (
					decl.id.type === "Identifier" &&
					decl.id.name === "routes" &&
					decl.init?.type === "ArrayExpression"
				) {
					const parsed = parseRoutesArray(decl.init, routesFileDir, warnings)
					routes.push(...parsed)
				}
			}
		}

		// Handle: export const routes = [...]
		if (
			node.type === "ExportNamedDeclaration" &&
			node.declaration?.type === "VariableDeclaration"
		) {
			for (const decl of node.declaration.declarations) {
				if (
					decl.id.type === "Identifier" &&
					decl.id.name === "routes" &&
					decl.init?.type === "ArrayExpression"
				) {
					const parsed = parseRoutesArray(decl.init, routesFileDir, warnings)
					routes.push(...parsed)
				}
			}
		}

		// Handle: export default [...]
		if (
			node.type === "ExportDefaultDeclaration" &&
			node.declaration.type === "ArrayExpression"
		) {
			const parsed = parseRoutesArray(node.declaration, routesFileDir, warnings)
			routes.push(...parsed)
		}

		// Handle: export default [...] satisfies RouteDefinition[]
		if (
			node.type === "ExportDefaultDeclaration" &&
			node.declaration.type === "TSSatisfiesExpression" &&
			node.declaration.expression.type === "ArrayExpression"
		) {
			const parsed = parseRoutesArray(
				node.declaration.expression,
				routesFileDir,
				warnings,
			)
			routes.push(...parsed)
		}
	}

	// Warn if no routes were found
	if (routes.length === 0) {
		warnings.push(
			"No routes found. Supported patterns: 'export const routes = [...]' or 'export default [...]'",
		)
	}

	return { routes, warnings }
}

/**
 * Parse an array expression containing route objects
 */
function parseRoutesArray(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	arrayNode: any,
	baseDir: string,
	warnings: string[],
): ParsedRoute[] {
	const routes: ParsedRoute[] = []

	for (const element of arrayNode.elements) {
		if (!element) continue

		// Handle spread elements
		if (element.type === "SpreadElement") {
			const loc = element.loc ? ` at line ${element.loc.start.line}` : ""
			warnings.push(
				`Spread operator detected${loc}. Routes from spread cannot be statically analyzed.`,
			)
			continue
		}

		if (element.type === "ObjectExpression") {
			const parsedRoutes = parseRouteObject(element, baseDir, warnings)
			routes.push(...parsedRoutes)
		} else {
			const loc = element.loc ? ` at line ${element.loc.start.line}` : ""
			warnings.push(
				`Non-object route element (${element.type})${loc}. Only object literals can be statically analyzed.`,
			)
		}
	}

	return routes
}

/**
 * Parse a single route object expression
 * Returns array to handle multiple paths case: path: ["/a", "/b"]
 */
function parseRouteObject(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	objectNode: any,
	baseDir: string,
	warnings: string[],
): ParsedRoute[] {
	let paths: string[] = []
	let component: string | undefined
	let children: ParsedRoute[] | undefined
	let hasPath = false

	for (const prop of objectNode.properties) {
		if (prop.type !== "ObjectProperty") continue
		if (prop.key.type !== "Identifier") continue

		const key = prop.key.name

		switch (key) {
			case "path":
				if (prop.value.type === "StringLiteral") {
					paths = [prop.value.value]
					hasPath = true
				} else if (prop.value.type === "ArrayExpression") {
					// Solid Router supports path arrays: path: ["/login", "/register"]
					paths = extractPathArray(prop.value, warnings)
					hasPath = paths.length > 0
				} else {
					const loc = prop.loc ? ` at line ${prop.loc.start.line}` : ""
					warnings.push(
						`Dynamic path value (${prop.value.type})${loc}. Only string literal paths can be statically analyzed.`,
					)
				}
				break

			case "component":
				component = extractComponent(prop.value, baseDir, warnings)
				break

			case "children":
				if (prop.value.type === "ArrayExpression") {
					children = parseRoutesArray(prop.value, baseDir, warnings)
				}
				break

			// preload and matchFilters are ignored (not relevant for screen detection)
		}
	}

	// Skip routes without path (abstract layout wrappers)
	if (!hasPath) {
		// If it has children, process them with empty parent path contribution
		if (children && children.length > 0) {
			return [{ path: "", component, children }]
		}
		return []
	}

	// Create routes for each path (handles path arrays)
	return paths.map((path) => ({
		path,
		component,
		children,
	}))
}

/**
 * Extract paths from array expression
 * path: ["/login", "/register"] -> ["/login", "/register"]
 */
function extractPathArray(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	arrayNode: any,
	warnings: string[],
): string[] {
	const paths: string[] = []

	for (const element of arrayNode.elements) {
		if (!element) continue

		if (element.type === "StringLiteral") {
			paths.push(element.value)
		} else {
			const loc = element.loc ? ` at line ${element.loc.start.line}` : ""
			warnings.push(
				`Non-string path in array (${element.type})${loc}. Only string literal paths can be analyzed.`,
			)
		}
	}

	return paths
}

/**
 * Extract component from various patterns
 * - Direct identifier: component: Home
 * - Lazy component: component: lazy(() => import("./Home"))
 */
function extractComponent(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	node: any,
	baseDir: string,
	warnings: string[],
): string | undefined {
	// Direct component reference: component: Home
	if (node.type === "Identifier") {
		return node.name
	}

	// Lazy component: component: lazy(() => import("./path"))
	if (node.type === "CallExpression") {
		const callee = node.callee
		if (callee.type === "Identifier" && callee.name === "lazy") {
			const lazyArg = node.arguments[0]
			if (lazyArg) {
				return extractLazyImportPath(lazyArg, baseDir, warnings)
			}
			const loc = node.loc ? ` at line ${node.loc.start.line}` : ""
			warnings.push(
				`lazy() called without arguments${loc}. Expected arrow function with import().`,
			)
			return undefined
		}
		// Other call expressions not supported
		return undefined
	}

	// Arrow function component: component: () => <Home />
	if (node.type === "ArrowFunctionExpression") {
		if (node.body.type === "JSXElement") {
			const openingElement = node.body.openingElement
			if (openingElement?.name?.type === "JSXIdentifier") {
				return openingElement.name.name
			}
		}
	}

	return undefined
}

/**
 * Extract import path from lazy function argument
 * () => import("./pages/Dashboard") -> resolved path
 */
function extractLazyImportPath(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	node: any,
	baseDir: string,
	warnings: string[],
): string | undefined {
	// Arrow function: () => import('./path')
	if (node.type === "ArrowFunctionExpression") {
		const body = node.body

		if (body.type === "CallExpression" && body.callee.type === "Import") {
			if (body.arguments[0]?.type === "StringLiteral") {
				return resolveImportPath(body.arguments[0].value, baseDir)
			}
			// Dynamic import argument
			const loc = node.loc ? ` at line ${node.loc.start.line}` : ""
			warnings.push(
				`Lazy import with dynamic path${loc}. Only string literal imports can be analyzed.`,
			)
			return undefined
		}
	}

	// Unrecognized lazy pattern
	const loc = node.loc ? ` at line ${node.loc.start.line}` : ""
	warnings.push(
		`Unrecognized lazy pattern (${node.type})${loc}. Expected arrow function with import().`,
	)
	return undefined
}

/**
 * Detect if content is Solid Router based on patterns
 */
export function isSolidRouterContent(content: string): boolean {
	// Check for Solid Router specific import
	if (content.includes("@solidjs/router")) {
		return true
	}

	// Check for old package name
	if (content.includes("solid-app-router")) {
		return true
	}

	// Check for Solid.js lazy with route pattern
	// This is a weaker check, so we need to be more specific
	if (
		content.includes("solid-js") &&
		/\blazy\s*\(/.test(content) &&
		/\bcomponent\s*:/.test(content) &&
		/\bpath\s*:/.test(content)
	) {
		return true
	}

	return false
}
