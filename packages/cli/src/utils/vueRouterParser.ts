import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { parse } from "@babel/parser"
import {
	type FlatRoute,
	flattenRoutes,
	type ParsedRoute,
	type ParseResult,
	pathToScreenId,
	pathToScreenTitle,
	resolveImportPath,
} from "./routeParserUtils.js"

// Re-export shared types and utilities
export type { ParsedRoute, FlatRoute, ParseResult }
export { flattenRoutes, pathToScreenId, pathToScreenTitle }

/**
 * Parse Vue Router configuration file and extract routes
 */
export function parseVueRouterConfig(
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

		// Handle: const routes = [...]; export { routes }
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

		// Handle: export default [...]
		if (
			node.type === "ExportDefaultDeclaration" &&
			node.declaration.type === "ArrayExpression"
		) {
			const parsed = parseRoutesArray(node.declaration, routesFileDir, warnings)
			routes.push(...parsed)
		}

		// Handle: export default [...] satisfies RouteRecordRaw[]
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
			"No routes array found. Supported patterns: 'export const routes = [...]', 'export default [...]', or 'export default [...] satisfies RouteRecordRaw[]'",
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
			const route = parseRouteObject(element, baseDir, warnings)
			if (route) {
				routes.push(route)
			}
		}
	}

	return routes
}

/**
 * Parse a single route object expression
 */
function parseRouteObject(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	objectNode: any,
	baseDir: string,
	warnings: string[],
): ParsedRoute | null {
	const route: ParsedRoute = {
		path: "",
	}

	for (const prop of objectNode.properties) {
		if (prop.type !== "ObjectProperty") continue
		if (prop.key.type !== "Identifier") continue

		const key = prop.key.name

		switch (key) {
			case "path":
				if (prop.value.type === "StringLiteral") {
					route.path = prop.value.value
				}
				break

			case "name":
				if (prop.value.type === "StringLiteral") {
					route.name = prop.value.value
				}
				break

			case "redirect":
				if (prop.value.type === "StringLiteral") {
					route.redirect = prop.value.value
				}
				break

			case "component":
				route.component = extractComponentPath(prop.value, baseDir)
				break

			case "children":
				if (prop.value.type === "ArrayExpression") {
					route.children = parseRoutesArray(prop.value, baseDir, warnings)
				}
				break
		}
	}

	// Skip routes without path
	if (!route.path) {
		return null
	}

	return route
}

/**
 * Extract component path from various component definitions
 */
// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
function extractComponentPath(node: any, baseDir: string): string | undefined {
	// Direct identifier: component: HomeView
	if (node.type === "Identifier") {
		return undefined // Can't resolve without tracking imports
	}

	// Arrow function with import: () => import('./views/Home.vue')
	if (node.type === "ArrowFunctionExpression") {
		const body = node.body

		// () => import('./path')
		if (body.type === "CallExpression" && body.callee.type === "Import") {
			if (body.arguments[0]?.type === "StringLiteral") {
				return resolveImportPath(body.arguments[0].value, baseDir)
			}
		}

		// () => import(/* webpackChunkName */ './path')
		if (body.type === "CallExpression" && body.callee.type === "Import") {
			for (const arg of body.arguments) {
				if (arg.type === "StringLiteral") {
					return resolveImportPath(arg.value, baseDir)
				}
			}
		}
	}

	return undefined
}
