import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { parse } from "@babel/parser"
import {
	createSpreadWarning,
	type ParsedRoute,
	type ParseResult,
	type ParseWarning,
	resolveImportPath,
} from "./routeParserUtils.js"

// Re-export shared types
export type { ParsedRoute, ParseResult }

/**
 * Parse Solid Router configuration file and extract routes.
 * Supports various export patterns including `export const routes`, `export default`,
 * and TypeScript's `satisfies` operator.
 *
 * @param filePath - Path to the router configuration file
 * @param preloadedContent - Optional pre-read file content to avoid duplicate file reads
 * @returns ParseResult containing extracted routes and any warnings
 * @throws Error if the file cannot be read or contains syntax errors
 */
export function parseSolidRouterConfig(
	filePath: string,
	preloadedContent?: string,
): ParseResult {
	const absolutePath = resolve(filePath)
	const routesFileDir = dirname(absolutePath)
	const warnings: ParseWarning[] = []

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
		warnings.push({
			type: "general",
			message:
				"No routes found. Supported patterns: 'export const routes = [...]' or 'export default [...]'",
		})
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
	warnings: ParseWarning[],
): ParsedRoute[] {
	const routes: ParsedRoute[] = []

	for (const element of arrayNode.elements) {
		if (!element) continue

		// Handle spread elements
		if (element.type === "SpreadElement") {
			warnings.push(createSpreadWarning(element))
			continue
		}

		if (element.type === "ObjectExpression") {
			const parsedRoutes = parseRouteObject(element, baseDir, warnings)
			routes.push(...parsedRoutes)
		} else {
			const line = element.loc?.start.line
			warnings.push({
				type: "general",
				message: `Non-object route element (${element.type})${line ? ` at line ${line}` : ""}. Only object literals can be statically analyzed.`,
				line,
			})
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
	warnings: ParseWarning[],
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
					const arrayElementCount = prop.value.elements.filter(Boolean).length
					paths = extractPathArray(prop.value, warnings)
					hasPath = paths.length > 0
					// Warn if path array had elements but none were extractable
					if (arrayElementCount > 0 && paths.length === 0) {
						const line = prop.loc?.start.line
						warnings.push({
							type: "general",
							message: `Path array contains only dynamic values${line ? ` at line ${line}` : ""}. No static paths could be extracted.`,
							line,
						})
					}
				} else {
					const line = prop.loc?.start.line
					warnings.push({
						type: "general",
						message: `Dynamic path value (${prop.value.type})${line ? ` at line ${line}` : ""}. Only string literal paths can be statically analyzed.`,
						line,
					})
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
	warnings: ParseWarning[],
): string[] {
	const paths: string[] = []

	for (const element of arrayNode.elements) {
		if (!element) continue

		if (element.type === "StringLiteral") {
			paths.push(element.value)
		} else {
			const line = element.loc?.start.line
			warnings.push({
				type: "general",
				message: `Non-string path in array (${element.type})${line ? ` at line ${line}` : ""}. Only string literal paths can be analyzed.`,
				line,
			})
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
	warnings: ParseWarning[],
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
			const line = node.loc?.start.line
			warnings.push({
				type: "general",
				message: `lazy() called without arguments${line ? ` at line ${line}` : ""}. Expected arrow function with import().`,
				line,
			})
			return undefined
		}
		// Other call expressions not supported - add warning
		const line = node.loc?.start.line
		const calleeName = callee.type === "Identifier" ? callee.name : "unknown"
		warnings.push({
			type: "general",
			message: `Unrecognized component pattern: ${calleeName}(...)${line ? ` at line ${line}` : ""}. Only 'lazy(() => import(...))' is supported.`,
			line,
		})
		return undefined
	}

	// Arrow function component: component: () => <Home />
	if (node.type === "ArrowFunctionExpression") {
		if (node.body.type === "JSXElement") {
			const openingElement = node.body.openingElement
			if (openingElement?.name?.type === "JSXIdentifier") {
				return openingElement.name.name
			}
			// JSXMemberExpression (namespaced components like <UI.Button />)
			if (openingElement?.name?.type === "JSXMemberExpression") {
				const line = node.loc?.start.line
				warnings.push({
					type: "general",
					message: `Namespaced JSX component (e.g., <UI.Button />)${line ? ` at line ${line}` : ""}. Component extraction not supported for member expressions. Consider using a direct component reference or create a wrapper component.`,
					line,
				})
				return undefined
			}
		}
		// Block body arrow functions
		if (node.body.type === "BlockStatement") {
			const line = node.loc?.start.line
			warnings.push({
				type: "general",
				message: `Arrow function with block body${line ? ` at line ${line}` : ""}. Only concise arrow functions returning JSX directly can be analyzed.`,
				line,
			})
			return undefined
		}
		// JSX Fragments
		if (node.body.type === "JSXFragment") {
			const line = node.loc?.start.line
			warnings.push({
				type: "general",
				message: `JSX Fragment detected${line ? ` at line ${line}` : ""}. Cannot extract component name from fragments.`,
				line,
			})
			return undefined
		}
		// Conditional expressions
		if (node.body.type === "ConditionalExpression") {
			const line = node.loc?.start.line
			// Try to extract component names from both branches for context
			let componentInfo = ""
			const consequent = node.body.consequent
			const alternate = node.body.alternate
			if (
				consequent?.type === "JSXElement" &&
				alternate?.type === "JSXElement"
			) {
				const consName = consequent.openingElement?.name?.name || "unknown"
				const altName = alternate.openingElement?.name?.name || "unknown"
				componentInfo = ` (${consName} or ${altName})`
			}
			warnings.push({
				type: "general",
				message: `Conditional component${componentInfo}${line ? ` at line ${line}` : ""}. Only static JSX elements can be analyzed. Consider extracting to a separate component.`,
				line,
			})
			return undefined
		}
		// Unrecognized arrow function body
		const line = node.loc?.start.line
		warnings.push({
			type: "general",
			message: `Unrecognized arrow function body (${node.body.type})${line ? ` at line ${line}` : ""}. Component will not be extracted.`,
			line,
		})
		return undefined
	}

	// Catch-all for unrecognized component patterns
	if (node) {
		const line = node.loc?.start.line
		warnings.push({
			type: "general",
			message: `Unrecognized component pattern (${node.type})${line ? ` at line ${line}` : ""}. Component will not be extracted.`,
			line,
		})
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
	warnings: ParseWarning[],
): string | undefined {
	// Arrow function: () => import('./path')
	if (node.type === "ArrowFunctionExpression") {
		const body = node.body

		if (body.type === "CallExpression" && body.callee.type === "Import") {
			if (body.arguments[0]?.type === "StringLiteral") {
				return resolveImportPath(body.arguments[0].value, baseDir)
			}
			// Dynamic import argument
			const line = node.loc?.start.line
			warnings.push({
				type: "general",
				message: `Lazy import with dynamic path${line ? ` at line ${line}` : ""}. Only string literal imports can be analyzed.`,
				line,
			})
			return undefined
		}
	}

	// Unrecognized lazy pattern
	const line = node.loc?.start.line
	warnings.push({
		type: "general",
		message: `Unrecognized lazy pattern (${node.type})${line ? ` at line ${line}` : ""}. Expected arrow function with import().`,
		line,
	})
	return undefined
}

/**
 * Detect if content is Solid Router based on patterns.
 * Note: Called by detectRouterType() in reactRouterParser.ts before React Router detection
 * because Solid Router and React Router share similar syntax patterns (both use `path` and `component`).
 * The detection order matters: TanStack Router -> Solid Router -> Angular Router -> React Router -> Vue Router.
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
