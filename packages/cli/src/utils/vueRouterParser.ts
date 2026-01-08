import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { parse } from "@babel/parser"
import {
	type FlatRoute,
	flattenRoutes,
	type ParsedRoute,
	type ParseResult,
	type ParseWarning,
	pathToScreenId,
	pathToScreenTitle,
	resolveImportPath,
} from "./routeParserUtils.js"

// Re-export shared types and utilities
export type { ParsedRoute, FlatRoute, ParseResult, ParseWarning }
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

	// Build import map to resolve component identifiers
	const importMap = buildImportMap(ast.program.body, routesFileDir)

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
					const parsed = parseRoutesArray(
						decl.init,
						routesFileDir,
						warnings,
						importMap,
					)
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
					const parsed = parseRoutesArray(
						decl.init,
						routesFileDir,
						warnings,
						importMap,
					)
					routes.push(...parsed)
				}
			}
		}

		// Handle: export default [...]
		if (
			node.type === "ExportDefaultDeclaration" &&
			node.declaration.type === "ArrayExpression"
		) {
			const parsed = parseRoutesArray(
				node.declaration,
				routesFileDir,
				warnings,
				importMap,
			)
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
				importMap,
			)
			routes.push(...parsed)
		}
	}

	// Warn if no routes were found
	if (routes.length === 0) {
		warnings.push({
			type: "general",
			message:
				"No routes array found. Supported patterns: 'export const routes = [...]', 'export default [...]', or 'export default [...] satisfies RouteRecordRaw[]'",
		})
	}

	return { routes, warnings }
}

/**
 * Map of identifier names to their resolved file paths
 */
type ImportMap = Map<string, string>

/**
 * Build a map of imported identifiers to their file paths
 */
function buildImportMap(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	body: any[],
	baseDir: string,
): ImportMap {
	const importMap: ImportMap = new Map()

	for (const node of body) {
		if (node.type !== "ImportDeclaration") continue

		const source = node.source.value
		if (typeof source !== "string") continue

		// Resolve the import path
		const resolvedPath = resolveImportPath(source, baseDir)
		if (!resolvedPath) continue

		// Map each imported specifier to the resolved path
		for (const specifier of node.specifiers) {
			if (specifier.type === "ImportDefaultSpecifier") {
				// import Component from './path'
				importMap.set(specifier.local.name, resolvedPath)
			} else if (specifier.type === "ImportSpecifier") {
				// import { Component } from './path'
				importMap.set(specifier.local.name, resolvedPath)
			}
		}
	}

	return importMap
}

/**
 * Parse an array expression containing route objects
 */
function parseRoutesArray(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	arrayNode: any,
	baseDir: string,
	warnings: ParseWarning[],
	importMap: ImportMap,
): ParsedRoute[] {
	const routes: ParsedRoute[] = []

	for (const element of arrayNode.elements) {
		if (!element) continue

		// Handle spread elements
		if (element.type === "SpreadElement") {
			const line = element.loc?.start.line
			const variableName =
				element.argument?.type === "Identifier"
					? element.argument.name
					: undefined

			warnings.push({
				type: "spread",
				message: `Spread operator detected${line ? ` at line ${line}` : ""}`,
				line,
				variableName,
			})
			continue
		}

		if (element.type === "ObjectExpression") {
			const route = parseRouteObject(element, baseDir, warnings, importMap)
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
	warnings: ParseWarning[],
	importMap: ImportMap,
): ParsedRoute | null {
	const route: Partial<ParsedRoute> = {}
	let hasPath = false

	for (const prop of objectNode.properties) {
		if (prop.type !== "ObjectProperty") continue
		if (prop.key.type !== "Identifier") continue

		const key = prop.key.name

		switch (key) {
			case "path":
				if (prop.value.type === "StringLiteral") {
					route.path = prop.value.value
					hasPath = true
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
				route.component = extractComponentPath(prop.value, baseDir, importMap)
				break

			case "children":
				if (prop.value.type === "ArrayExpression") {
					route.children = parseRoutesArray(
						prop.value,
						baseDir,
						warnings,
						importMap,
					)
				}
				break
		}
	}

	// Skip routes without path property
	// Empty string "" is valid in Vue Router (matches parent path)
	if (!hasPath) {
		return null
	}

	return route as ParsedRoute
}

/**
 * Extract component path from various component definitions
 */
function extractComponentPath(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	node: any,
	baseDir: string,
	importMap: ImportMap,
): string | undefined {
	// Direct identifier: component: HomeView
	if (node.type === "Identifier") {
		// Look up the identifier in the import map
		return importMap.get(node.name)
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
