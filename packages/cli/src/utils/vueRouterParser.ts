import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { parse } from "@babel/parser"
import {
	createSpreadWarning,
	type FlatRoute,
	flattenRoutes,
	type ParsedRoute,
	type ParseResult,
	type ParseWarning,
	pathToScreenId,
	pathToScreenTitle,
	resolveImportPath,
	type SpreadResolutionContext,
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

	// Build spread resolution context
	const localRouteVariables = buildRouteVariableMap(ast.program.body)
	const importedRouteVariables = buildRouteImportMap(
		ast.program.body,
		routesFileDir,
	)
	const resolutionContext: SpreadResolutionContext = {
		localRouteVariables,
		importedRouteVariables,
		baseDir: routesFileDir,
		maxDepth: 3,
		currentDepth: 0,
	}

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
						resolutionContext,
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
						resolutionContext,
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
				resolutionContext,
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
				resolutionContext,
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

/** Cache for imported routes to avoid re-parsing */
const importedRoutesCache = new Map<string, ParsedRoute[]>()

/**
 * Clear the imported routes cache (useful for testing)
 */
export function clearImportedRoutesCache(): void {
	importedRoutesCache.clear()
}

/**
 * Build a map of route array variables defined in the same file.
 * Scans for const/let declarations of arrays that could be route definitions.
 */
function buildRouteVariableMap(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	body: any[],
): Map<string, unknown> {
	const routeVarMap = new Map<string, unknown>()

	for (const node of body) {
		if (node.type === "VariableDeclaration") {
			for (const decl of node.declarations) {
				if (
					decl.id.type === "Identifier" &&
					decl.init?.type === "ArrayExpression"
				) {
					// Store the array expression for later resolution
					routeVarMap.set(decl.id.name, decl.init)
				}
			}
		}
	}

	return routeVarMap
}

/**
 * Build a map of imported route array variables to their source files.
 * Only tracks imports that look like route arrays (name contains 'route' or 'Routes').
 */
function buildRouteImportMap(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	body: any[],
	baseDir: string,
): Map<string, string> {
	const importMap = new Map<string, string>()

	for (const node of body) {
		if (node.type !== "ImportDeclaration") continue

		const source = node.source.value
		if (typeof source !== "string") continue

		const resolvedPath = resolveImportPath(source, baseDir)
		if (!resolvedPath) continue

		for (const specifier of node.specifiers) {
			const localName = specifier.local?.name
			if (!localName) continue

			// Heuristic: variable names containing 'route' are likely route arrays
			if (localName.toLowerCase().includes("route")) {
				importMap.set(localName, resolvedPath)
			}
		}
	}

	return importMap
}

/**
 * Attempt to resolve a spread element to its route definitions.
 */
function resolveSpreadElement(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	element: any,
	context: SpreadResolutionContext,
	warnings: ParseWarning[],
	importMap: ImportMap,
): ParsedRoute[] | null {
	const argument = element.argument

	// Case 1: Simple identifier (e.g., ...devRoutes)
	if (argument.type === "Identifier") {
		return resolveIdentifierSpread(argument.name, context, warnings, importMap)
	}

	// Case 2: Conditional expression (e.g., ...(condition ? routes : []))
	if (argument.type === "ConditionalExpression") {
		return resolveConditionalSpread(argument, context, warnings, importMap)
	}

	// Case 3: Logical expression (e.g., ...(isDev && devRoutes))
	if (argument.type === "LogicalExpression") {
		return resolveLogicalSpread(argument, context, warnings, importMap)
	}

	// Unresolvable pattern
	return null
}

/**
 * Resolve an identifier spread (e.g., ...devRoutes)
 */
function resolveIdentifierSpread(
	variableName: string,
	context: SpreadResolutionContext,
	warnings: ParseWarning[],
	importMap: ImportMap,
): ParsedRoute[] | null {
	// Try local variable first
	const localArray = context.localRouteVariables.get(variableName)
	if (localArray) {
		return parseRoutesArray(
			localArray,
			context.baseDir,
			warnings,
			importMap,
			context,
		)
	}

	// Try imported variable
	const importPath = context.importedRouteVariables.get(variableName)
	if (importPath) {
		return resolveImportedRoutes(importPath, variableName, context, warnings)
	}

	return null
}

/**
 * Resolve conditional spread (e.g., ...(condition ? routes : []))
 * Strategy: Parse both branches and merge results.
 */
function resolveConditionalSpread(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	conditionalExpr: any,
	context: SpreadResolutionContext,
	warnings: ParseWarning[],
	importMap: ImportMap,
): ParsedRoute[] | null {
	const routes: ParsedRoute[] = []
	let resolved = false

	// Try consequent (true branch)
	if (conditionalExpr.consequent) {
		const consequentRoutes = resolveSpreadArgument(
			conditionalExpr.consequent,
			context,
			warnings,
			importMap,
		)
		if (consequentRoutes) {
			routes.push(...consequentRoutes)
			resolved = true
		}
	}

	// Try alternate (false branch) - usually empty array
	if (conditionalExpr.alternate) {
		const alternateRoutes = resolveSpreadArgument(
			conditionalExpr.alternate,
			context,
			warnings,
			importMap,
		)
		if (alternateRoutes) {
			routes.push(...alternateRoutes)
			resolved = true
		}
	}

	return resolved ? routes : null
}

/**
 * Resolve logical expression spread (e.g., ...(isDev && devRoutes))
 * Strategy: Try to resolve the right operand.
 */
function resolveLogicalSpread(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	logicalExpr: any,
	context: SpreadResolutionContext,
	warnings: ParseWarning[],
	importMap: ImportMap,
): ParsedRoute[] | null {
	// For && operator, try to resolve the right operand
	if (logicalExpr.operator === "&&") {
		return resolveSpreadArgument(
			logicalExpr.right,
			context,
			warnings,
			importMap,
		)
	}

	// For || operator, try both operands
	if (logicalExpr.operator === "||") {
		const routes: ParsedRoute[] = []
		let resolved = false

		const leftRoutes = resolveSpreadArgument(
			logicalExpr.left,
			context,
			warnings,
			importMap,
		)
		if (leftRoutes) {
			routes.push(...leftRoutes)
			resolved = true
		}

		const rightRoutes = resolveSpreadArgument(
			logicalExpr.right,
			context,
			warnings,
			importMap,
		)
		if (rightRoutes) {
			routes.push(...rightRoutes)
			resolved = true
		}

		return resolved ? routes : null
	}

	return null
}

/**
 * Resolve a spread argument which could be an identifier, array, or expression
 */
function resolveSpreadArgument(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	node: any,
	context: SpreadResolutionContext,
	warnings: ParseWarning[],
	importMap: ImportMap,
): ParsedRoute[] | null {
	// Empty array: []
	if (node.type === "ArrayExpression" && node.elements.length === 0) {
		return []
	}

	// Array with routes
	if (node.type === "ArrayExpression") {
		return parseRoutesArray(node, context.baseDir, warnings, importMap, context)
	}

	// Identifier reference
	if (node.type === "Identifier") {
		return resolveIdentifierSpread(node.name, context, warnings, importMap)
	}

	// Nested conditional
	if (node.type === "ConditionalExpression") {
		return resolveConditionalSpread(node, context, warnings, importMap)
	}

	// Nested logical
	if (node.type === "LogicalExpression") {
		return resolveLogicalSpread(node, context, warnings, importMap)
	}

	return null
}

/**
 * Resolve routes from an imported file.
 */
function resolveImportedRoutes(
	filePath: string,
	variableName: string,
	context: SpreadResolutionContext,
	warnings: ParseWarning[],
): ParsedRoute[] | null {
	// Depth limit to prevent infinite recursion
	if (context.currentDepth >= context.maxDepth) {
		warnings.push({
			type: "general",
			message: `Maximum import depth (${context.maxDepth}) reached while resolving '${variableName}' from '${filePath}'`,
		})
		return null
	}

	// Check cache
	const cacheKey = `${filePath}:${variableName}`
	const cached = importedRoutesCache.get(cacheKey)
	if (cached) {
		return cached
	}

	// Try to read the file with common extensions
	const extensions = ["", ".ts", ".tsx", ".js", ".jsx"]
	let content: string | null = null
	let actualPath = filePath

	for (const ext of extensions) {
		try {
			actualPath = filePath + ext
			content = readFileSync(actualPath, "utf-8")
			break
		} catch {
			// Try next extension
		}
	}

	if (!content) {
		return null
	}

	try {
		// Parse the imported file
		const ast = parse(content, {
			sourceType: "module",
			plugins: ["typescript", "jsx"],
		})

		const importedDir = dirname(actualPath)
		const importMap = buildImportMap(ast.program.body, importedDir)
		const localRouteVariables = buildRouteVariableMap(ast.program.body)
		const importedRouteVariables = buildRouteImportMap(
			ast.program.body,
			importedDir,
		)

		// Create new context with incremented depth
		const nestedContext: SpreadResolutionContext = {
			localRouteVariables,
			importedRouteVariables,
			baseDir: importedDir,
			maxDepth: context.maxDepth,
			currentDepth: context.currentDepth + 1,
		}

		// Look for the exported variable in the AST
		for (const node of ast.program.body) {
			const routes = extractRoutesFromExport(
				node,
				variableName,
				nestedContext,
				warnings,
				importMap,
			)
			if (routes) {
				importedRoutesCache.set(cacheKey, routes)
				return routes
			}
		}

		return null
	} catch {
		return null
	}
}

/**
 * Extract routes from an export statement matching the variable name
 */
function extractRoutesFromExport(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	node: any,
	variableName: string,
	context: SpreadResolutionContext,
	warnings: ParseWarning[],
	importMap: ImportMap,
): ParsedRoute[] | null {
	// Handle: export const varName = [...]
	if (
		node.type === "ExportNamedDeclaration" &&
		node.declaration?.type === "VariableDeclaration"
	) {
		for (const decl of node.declaration.declarations) {
			if (
				decl.id.type === "Identifier" &&
				decl.id.name === variableName &&
				decl.init?.type === "ArrayExpression"
			) {
				return parseRoutesArray(
					decl.init,
					context.baseDir,
					warnings,
					importMap,
					context,
				)
			}
		}
	}

	// Handle: const varName = [...]; (for later export { varName })
	if (node.type === "VariableDeclaration") {
		for (const decl of node.declarations) {
			if (
				decl.id.type === "Identifier" &&
				decl.id.name === variableName &&
				decl.init?.type === "ArrayExpression"
			) {
				return parseRoutesArray(
					decl.init,
					context.baseDir,
					warnings,
					importMap,
					context,
				)
			}
		}
	}

	// Handle: export default [...] (when variableName is 'default')
	if (
		variableName === "default" &&
		node.type === "ExportDefaultDeclaration" &&
		node.declaration.type === "ArrayExpression"
	) {
		return parseRoutesArray(
			node.declaration,
			context.baseDir,
			warnings,
			importMap,
			context,
		)
	}

	return null
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
	resolutionContext?: SpreadResolutionContext,
): ParsedRoute[] {
	const routes: ParsedRoute[] = []

	for (const element of arrayNode.elements) {
		if (!element) continue

		// Handle spread elements
		if (element.type === "SpreadElement") {
			// Try to resolve the spread if context is available
			if (resolutionContext) {
				const resolvedRoutes = resolveSpreadElement(
					element,
					resolutionContext,
					warnings,
					importMap,
				)
				if (resolvedRoutes) {
					routes.push(...resolvedRoutes)
					// Add a resolved warning for informational purposes
					const spreadWarning = createSpreadWarning(element)
					spreadWarning.resolved = true
					warnings.push(spreadWarning)
					continue
				}
			}
			// If resolution fails or no context, add unresolved warning
			const spreadWarning = createSpreadWarning(element)
			spreadWarning.resolved = false
			spreadWarning.resolutionFailureReason = resolutionContext
				? "Could not resolve the spread target"
				: "Spread resolution not available"
			warnings.push(spreadWarning)
			continue
		}

		if (element.type === "ObjectExpression") {
			const route = parseRouteObject(
				element,
				baseDir,
				warnings,
				importMap,
				resolutionContext,
			)
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
	resolutionContext?: SpreadResolutionContext,
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
						resolutionContext,
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
