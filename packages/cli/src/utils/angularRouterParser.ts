import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { parse } from "@babel/parser"
import {
	createSpreadWarning,
	type ParsedRoute,
	type ParseResult,
	type ParseWarning,
	resolveImportPath,
	type SpreadResolutionContext,
} from "./routeParserUtils.js"

// Re-export shared types
export type { ParsedRoute, ParseResult, ParseWarning }

/**
 * Cache for imported routes to avoid re-parsing.
 *
 * Note: This is a module-level cache that persists for the lifetime of the Node.js process.
 * For CLI usage (single runs), this is optimal. For long-running processes (dev server, watch mode),
 * the cache should be cleared when source files change using `clearImportedRoutesCache()`.
 * The cache is keyed by `${filePath}:${variableName}` to handle multiple exports from the same file.
 */
const importedRoutesCache = new Map<string, ParsedRoute[]>()

/**
 * Clear the imported routes cache (useful for testing)
 */
export function clearImportedRoutesCache(): void {
	importedRoutesCache.clear()
}

/**
 * Parse Angular Router configuration file and extract routes.
 * Supports both Standalone (Angular 14+) and NgModule patterns.
 *
 * Supported patterns:
 * - `export const routes: Routes = [...]`
 * - `const routes: Routes = [...]`
 * - `RouterModule.forRoot([...])`
 * - `RouterModule.forChild([...])`
 * - `export default [...]`
 * - `export default [...] satisfies Routes`
 *
 * @param filePath - Path to the router configuration file
 * @param preloadedContent - Optional pre-read file content. When provided, the file is not read from disk,
 *                           enabling testing with virtual content or avoiding duplicate file reads.
 * @returns ParseResult containing extracted routes and any warnings
 * @throws Error if the file cannot be read or contains syntax errors
 */
export function parseAngularRouterConfig(
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
			plugins: ["typescript", ["decorators", { decoratorsBeforeExport: true }]],
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
		// Handle: const routes: Routes = [...] (non-exported, but with Routes type)
		// Note: Only parse non-exported variables if they have explicit Routes type annotation.
		// Variables that just have "route" in their name (e.g., devRoutes, adminRoutes) are likely
		// helper variables used in spread operators and will be resolved through spread resolution.
		if (node.type === "VariableDeclaration") {
			for (const decl of node.declarations) {
				if (
					decl.id.type === "Identifier" &&
					decl.init?.type === "ArrayExpression"
				) {
					// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
					const typeAnnotation = (decl.id as any).typeAnnotation?.typeAnnotation
					const hasRoutesType =
						typeAnnotation?.type === "TSTypeReference" &&
						typeAnnotation.typeName?.type === "Identifier" &&
						typeAnnotation.typeName.name === "Routes"
					if (hasRoutesType) {
						const parsed = parseRoutesArray(
							decl.init,
							routesFileDir,
							warnings,
							resolutionContext,
						)
						routes.push(...parsed)
					}
				}
			}
		}

		// Handle: export const routes: Routes = [...]
		if (
			node.type === "ExportNamedDeclaration" &&
			node.declaration?.type === "VariableDeclaration"
		) {
			for (const decl of node.declaration.declarations) {
				if (
					decl.id.type === "Identifier" &&
					decl.init?.type === "ArrayExpression"
				) {
					// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
					const typeAnnotation = (decl.id as any).typeAnnotation?.typeAnnotation
					const isRoutesVariable =
						decl.id.name.toLowerCase().includes("route") ||
						(typeAnnotation?.type === "TSTypeReference" &&
							typeAnnotation.typeName?.type === "Identifier" &&
							typeAnnotation.typeName.name === "Routes")
					if (isRoutesVariable) {
						const parsed = parseRoutesArray(
							decl.init,
							routesFileDir,
							warnings,
							resolutionContext,
						)
						routes.push(...parsed)
					}
				}
			}
		}

		// Handle: export default [...] (less common but possible)
		if (
			node.type === "ExportDefaultDeclaration" &&
			node.declaration.type === "ArrayExpression"
		) {
			const parsed = parseRoutesArray(
				node.declaration,
				routesFileDir,
				warnings,
				resolutionContext,
			)
			routes.push(...parsed)
		}

		// Handle: export default [...] satisfies Routes
		if (
			node.type === "ExportDefaultDeclaration" &&
			node.declaration.type === "TSSatisfiesExpression" &&
			node.declaration.expression.type === "ArrayExpression"
		) {
			const parsed = parseRoutesArray(
				node.declaration.expression,
				routesFileDir,
				warnings,
				resolutionContext,
			)
			routes.push(...parsed)
		}

		// Handle NgModule pattern: RouterModule.forRoot([...]) or RouterModule.forChild([...])
		// This can appear in @NgModule decorator or as a call expression
		// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
		let classNode: any = null
		if (node.type === "ClassDeclaration") {
			classNode = node
		} else if (
			node.type === "ExportNamedDeclaration" &&
			// biome-ignore lint/suspicious/noExplicitAny: AST node types require type assertions
			(node as any).declaration?.type === "ClassDeclaration"
		) {
			// biome-ignore lint/suspicious/noExplicitAny: AST node types require type assertions
			classNode = (node as any).declaration
		}

		if (classNode) {
			const decorators = classNode.decorators || []
			for (const decorator of decorators) {
				if (decorator.expression?.type === "CallExpression") {
					const routesFromDecorator = extractRoutesFromNgModule(
						decorator.expression,
						routesFileDir,
						warnings,
						resolutionContext,
					)
					routes.push(...routesFromDecorator)
				}
			}
		}

		// Handle standalone RouterModule.forRoot/forChild calls in exports
		if (node.type === "ExpressionStatement") {
			const routesFromExpr = extractRoutesFromExpression(
				node.expression,
				routesFileDir,
				warnings,
				resolutionContext,
			)
			routes.push(...routesFromExpr)
		}
	}

	// Warn if no routes were found
	if (routes.length === 0) {
		warnings.push({
			type: "general",
			message:
				"No routes found. Supported patterns: 'export const routes: Routes = [...]', 'RouterModule.forRoot([...])', or 'RouterModule.forChild([...])'",
		})
	}

	return { routes, warnings }
}

/**
 * Extract routes from @NgModule decorator
 */
function extractRoutesFromNgModule(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	callExpr: any,
	baseDir: string,
	warnings: ParseWarning[],
	resolutionContext?: SpreadResolutionContext,
): ParsedRoute[] {
	const routes: ParsedRoute[] = []

	// Check if it's @NgModule({...})
	if (
		callExpr.callee?.type === "Identifier" &&
		callExpr.callee.name === "NgModule"
	) {
		const arg = callExpr.arguments[0]
		if (arg?.type === "ObjectExpression") {
			for (const prop of arg.properties) {
				if (
					prop.type === "ObjectProperty" &&
					prop.key?.type === "Identifier" &&
					prop.key.name === "imports"
				) {
					if (prop.value?.type === "ArrayExpression") {
						for (const element of prop.value.elements) {
							if (!element) continue
							const extracted = extractRoutesFromExpression(
								element,
								baseDir,
								warnings,
								resolutionContext,
							)
							routes.push(...extracted)
						}
					}
				}
			}
		}
	}

	return routes
}

/**
 * Extract routes from RouterModule.forRoot/forChild call expressions
 */
function extractRoutesFromExpression(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	node: any,
	baseDir: string,
	warnings: ParseWarning[],
	resolutionContext?: SpreadResolutionContext,
): ParsedRoute[] {
	const routes: ParsedRoute[] = []

	if (node?.type !== "CallExpression") return routes

	const callee = node.callee
	if (
		callee?.type === "MemberExpression" &&
		callee.object?.type === "Identifier" &&
		callee.object.name === "RouterModule" &&
		callee.property?.type === "Identifier" &&
		(callee.property.name === "forRoot" || callee.property.name === "forChild")
	) {
		const routesArg = node.arguments[0]
		if (routesArg?.type === "ArrayExpression") {
			const parsed = parseRoutesArray(
				routesArg,
				baseDir,
				warnings,
				resolutionContext,
			)
			routes.push(...parsed)
		}
	}

	return routes
}

/**
 * Parse an array expression containing route objects
 */
function parseRoutesArray(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	arrayNode: any,
	baseDir: string,
	warnings: ParseWarning[],
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
			spreadWarning.resolutionFailureReason = getSpreadFailureReason(
				element,
				resolutionContext,
			)
			warnings.push(spreadWarning)
			continue
		}

		if (element.type === "ObjectExpression") {
			const parsedRoute = parseRouteObject(
				element,
				baseDir,
				warnings,
				resolutionContext,
			)
			if (parsedRoute) {
				routes.push(parsedRoute)
			}
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
 */
function parseRouteObject(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	objectNode: any,
	baseDir: string,
	warnings: ParseWarning[],
	resolutionContext?: SpreadResolutionContext,
): ParsedRoute | null {
	let path: string | undefined
	let component: string | undefined
	let children: ParsedRoute[] | undefined
	let redirectTo: string | undefined
	let hasPath = false

	for (const prop of objectNode.properties) {
		if (prop.type !== "ObjectProperty") continue
		if (prop.key.type !== "Identifier") continue

		const key = prop.key.name

		switch (key) {
			case "path":
				if (prop.value.type === "StringLiteral") {
					path = prop.value.value
					hasPath = true
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
				// Direct component reference: component: HomeComponent
				if (prop.value.type === "Identifier") {
					component = prop.value.name
				}
				break

			case "loadComponent":
				// Lazy component: loadComponent: () => import('./path').then(m => m.Component)
				component = extractLazyComponent(prop.value, baseDir, warnings)
				break

			case "loadChildren": {
				// Lazy children: loadChildren: () => import('./path').then(m => m.routes)
				// We just note this for now - the actual routes are in another file
				const lazyPath = extractLazyPath(prop.value, baseDir, warnings)
				if (lazyPath) {
					component = `[lazy: ${lazyPath}]`
				}
				break
			}

			case "children":
				if (prop.value.type === "ArrayExpression") {
					children = parseRoutesArray(
						prop.value,
						baseDir,
						warnings,
						resolutionContext,
					)
				}
				break

			case "redirectTo":
				if (prop.value.type === "StringLiteral") {
					redirectTo = prop.value.value
				}
				break

			// Skip these properties (not relevant for screen detection)
			case "pathMatch":
			case "canActivate":
			case "canDeactivate":
			case "canMatch":
			case "resolve":
			case "data":
			case "title":
			case "providers":
			case "runGuardsAndResolvers":
			case "outlet":
				break
		}
	}

	// Skip redirect-only routes (no component)
	if (redirectTo && !component && !children) {
		return null
	}

	// Skip routes without path (unless they have children for layout purposes)
	if (!hasPath) {
		if (children && children.length > 0) {
			return { path: "", component, children }
		}
		return null
	}

	return {
		path: path || "",
		component,
		children,
	}
}

/**
 * Extract component from lazy loadComponent pattern
 * loadComponent: () => import('./path').then(m => m.Component)
 */
function extractLazyComponent(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	node: any,
	baseDir: string,
	warnings: ParseWarning[],
): string | undefined {
	// Arrow function: () => import('./path').then(m => m.Component)
	if (node.type === "ArrowFunctionExpression") {
		const body = node.body

		// Handle .then(m => m.Component) chain
		if (
			body.type === "CallExpression" &&
			body.callee?.type === "MemberExpression" &&
			body.callee.property?.type === "Identifier" &&
			body.callee.property.name === "then"
		) {
			const importCall = body.callee.object
			const thenArg = body.arguments[0]

			// Check if it's an import() call
			if (
				importCall?.type === "CallExpression" &&
				importCall.callee?.type === "Import"
			) {
				// Check if the argument is a string literal
				if (importCall.arguments[0]?.type === "StringLiteral") {
					const importPath = resolveImportPath(
						importCall.arguments[0].value,
						baseDir,
					)

					// Extract component name from .then(m => m.Component)
					if (
						thenArg?.type === "ArrowFunctionExpression" &&
						thenArg.body?.type === "MemberExpression" &&
						thenArg.body.property?.type === "Identifier"
					) {
						return `${importPath}#${thenArg.body.property.name}`
					}

					return importPath
				}
				// Dynamic import path - warn the user
				const line = node.loc?.start.line
				warnings.push({
					type: "general",
					message: `Lazy loadComponent with dynamic path${line ? ` at line ${line}` : ""}. Only string literal imports can be analyzed.`,
					line,
				})
				return undefined
			}
		}

		// Direct import without .then(): () => import('./path')
		if (body.type === "CallExpression" && body.callee?.type === "Import") {
			if (body.arguments[0]?.type === "StringLiteral") {
				return resolveImportPath(body.arguments[0].value, baseDir)
			}
			const line = node.loc?.start.line
			warnings.push({
				type: "general",
				message: `Lazy loadComponent with dynamic path${line ? ` at line ${line}` : ""}. Only string literal imports can be analyzed.`,
				line,
			})
			return undefined
		}
	}

	const line = node.loc?.start.line
	warnings.push({
		type: "general",
		message: `Unrecognized loadComponent pattern (${node.type})${line ? ` at line ${line}` : ""}. Expected arrow function with import().then().`,
		line,
	})
	return undefined
}

/**
 * Extract path from lazy loadChildren pattern
 * loadChildren: () => import('./path').then(m => m.routes)
 */
function extractLazyPath(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	node: any,
	baseDir: string,
	warnings: ParseWarning[],
): string | undefined {
	if (node.type === "ArrowFunctionExpression") {
		const body = node.body

		// Handle .then() chain
		if (
			body.type === "CallExpression" &&
			body.callee?.type === "MemberExpression" &&
			body.callee.property?.type === "Identifier" &&
			body.callee.property.name === "then"
		) {
			const importCall = body.callee.object
			if (
				importCall?.type === "CallExpression" &&
				importCall.callee?.type === "Import" &&
				importCall.arguments[0]?.type === "StringLiteral"
			) {
				return resolveImportPath(importCall.arguments[0].value, baseDir)
			}
		}

		// Direct import without .then()
		if (body.type === "CallExpression" && body.callee?.type === "Import") {
			if (body.arguments[0]?.type === "StringLiteral") {
				return resolveImportPath(body.arguments[0].value, baseDir)
			}
		}
	}

	const line = node.loc?.start.line
	warnings.push({
		type: "general",
		message: `Unrecognized loadChildren pattern (${node.type})${line ? ` at line ${line}` : ""}. Expected arrow function with import().`,
		line,
	})
	return undefined
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
 *
 * Uses a heuristic: only tracks imports whose local name contains 'route' (case-insensitive).
 * This avoids resolving unrelated imports while catching common patterns like:
 * - `adminRoutes`, `devRoutes`, `publicRoutes`
 * - `routeConfig`, `routeDefinitions`
 *
 * **Limitation**: Route arrays with other naming conventions (e.g., `pages`, `screens`, `navigation`)
 * will NOT be resolved automatically. Users should rename such imports to include 'route' in the name,
 * or define the routes directly in the main routes file.
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
 * Delegates to resolveSpreadArgument after extracting the spread argument.
 */
function resolveSpreadElement(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	element: any,
	context: SpreadResolutionContext,
	warnings: ParseWarning[],
): ParsedRoute[] | null {
	return resolveSpreadArgument(element.argument, context, warnings)
}

/**
 * Resolve an identifier spread (e.g., ...devRoutes)
 */
function resolveIdentifierSpread(
	variableName: string,
	context: SpreadResolutionContext,
	warnings: ParseWarning[],
): ParsedRoute[] | null {
	// Try local variable first
	const localArray = context.localRouteVariables.get(variableName)
	if (localArray) {
		return parseRoutesArray(localArray, context.baseDir, warnings, context)
	}

	// Try imported variable
	const importPath = context.importedRouteVariables.get(variableName)
	if (importPath) {
		return resolveImportedRoutes(importPath, variableName, context, warnings)
	}

	return null
}

/**
 * Collect routes from multiple AST nodes, merging results.
 * Returns null only if no nodes could be resolved.
 */
function collectRoutesFromNodes(
	nodes: unknown[],
	context: SpreadResolutionContext,
	warnings: ParseWarning[],
): ParsedRoute[] | null {
	const routes: ParsedRoute[] = []
	let resolved = false

	for (const node of nodes) {
		if (!node) continue
		const nodeRoutes = resolveSpreadArgument(node, context, warnings)
		if (nodeRoutes) {
			routes.push(...nodeRoutes)
			resolved = true
		}
	}

	return resolved ? routes : null
}

/**
 * Resolve conditional spread (e.g., ...(condition ? routes : []))
 *
 * Strategy: Parse both branches and merge results.
 * Since we perform static analysis without runtime evaluation, we cannot determine
 * which branch will be taken at runtime. Including routes from both branches ensures
 * comprehensive coverage for screen catalog generation.
 *
 * Example: `...(import.meta.env.PROD ? prodRoutes : devRoutes)` will include both
 * prodRoutes and devRoutes in the generated catalog.
 */
function resolveConditionalSpread(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	conditionalExpr: any,
	context: SpreadResolutionContext,
	warnings: ParseWarning[],
): ParsedRoute[] | null {
	return collectRoutesFromNodes(
		[conditionalExpr.consequent, conditionalExpr.alternate],
		context,
		warnings,
	)
}

/**
 * Resolve logical expression spread (e.g., ...(isDev && devRoutes))
 *
 * Strategy varies by operator:
 * - `&&`: Resolve the right operand only (the left is typically a condition).
 *   Example: `...(isDev && devRoutes)` - only devRoutes is resolved.
 * - `||`: Resolve both operands (either could be used at runtime).
 *   Example: `...(primaryRoutes || fallbackRoutes)` - both are resolved.
 *
 * This approach provides comprehensive coverage while handling common patterns.
 */
function resolveLogicalSpread(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	logicalExpr: any,
	context: SpreadResolutionContext,
	warnings: ParseWarning[],
): ParsedRoute[] | null {
	switch (logicalExpr.operator) {
		case "&&":
			// For &&, only the right operand contains routes (left is the condition)
			return resolveSpreadArgument(logicalExpr.right, context, warnings)

		case "||":
			// For ||, either operand could be used at runtime
			return collectRoutesFromNodes(
				[logicalExpr.left, logicalExpr.right],
				context,
				warnings,
			)

		default:
			return null
	}
}

/**
 * Resolve a spread argument which could be an identifier, array, or expression
 */
function resolveSpreadArgument(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	node: any,
	context: SpreadResolutionContext,
	warnings: ParseWarning[],
): ParsedRoute[] | null {
	switch (node.type) {
		case "ArrayExpression":
			// Empty array returns empty, otherwise parse routes
			return node.elements.length === 0
				? []
				: parseRoutesArray(node, context.baseDir, warnings, context)

		case "Identifier":
			return resolveIdentifierSpread(node.name, context, warnings)

		case "ConditionalExpression":
			return resolveConditionalSpread(node, context, warnings)

		case "LogicalExpression":
			return resolveLogicalSpread(node, context, warnings)

		default:
			return null
	}
}

/**
 * Get a descriptive failure reason for an unresolved spread element.
 */
function getSpreadFailureReason(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	element: any,
	context?: SpreadResolutionContext,
): string {
	if (!context) {
		return "Spread resolution not available in this context"
	}

	const argument = element.argument
	if (!argument) {
		return "Invalid spread element (missing argument)"
	}

	switch (argument.type) {
		case "Identifier": {
			const variableName = argument.name
			const isLocalDefined = context.localRouteVariables.has(variableName)
			const isImported = context.importedRouteVariables.has(variableName)

			if (!isLocalDefined && !isImported) {
				// Hint about naming heuristic if variable doesn't contain 'route'
				if (!variableName.toLowerCase().includes("route")) {
					return `Variable '${variableName}' not found. Note: Only imports with 'route' in the name are tracked for resolution.`
				}
				return `Variable '${variableName}' not found in local scope or imports`
			}
			// Variable was found but resolution still failed
			return `Failed to resolve '${variableName}' - see other warnings for details`
		}

		case "ConditionalExpression":
			return "Could not resolve conditional expression - both branches failed to resolve"

		case "LogicalExpression":
			return `Could not resolve logical expression (${argument.operator}) - operands failed to resolve`

		case "CallExpression":
			return "Function call results cannot be statically resolved"

		default:
			return `Unsupported spread pattern: ${argument.type}`
	}
}

/**
 * Resolve routes from an imported file.
 *
 * Features:
 * - Respects `maxDepth` to prevent infinite recursion from circular imports
 * - Results are cached by file path and variable name to avoid redundant parsing
 * - Automatically tries common file extensions (.ts, .tsx, .js, .jsx) if path lacks extension
 *
 * Error handling:
 * - Warns when file cannot be found or read
 * - Warns when file has syntax errors
 * - Warns when the expected export is not found in the file
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
		actualPath = filePath + ext

		// Check if file exists before attempting to read
		if (!existsSync(actualPath)) {
			continue
		}

		try {
			content = readFileSync(actualPath, "utf-8")
			break
		} catch (error) {
			// Log unexpected read errors (permission denied, I/O errors, etc.)
			const message = error instanceof Error ? error.message : String(error)
			warnings.push({
				type: "general",
				message: `Failed to read '${actualPath}' while resolving '${variableName}': ${message}`,
			})
			// Continue trying other extensions
		}
	}

	if (!content) {
		warnings.push({
			type: "general",
			message: `Could not find imported routes file for '${variableName}'. Tried: ${extensions.map((ext) => `'${filePath}${ext}'`).join(", ")}`,
		})
		return null
	}

	try {
		// Parse the imported file
		const ast = parse(content, {
			sourceType: "module",
			plugins: ["typescript", ["decorators", { decoratorsBeforeExport: true }]],
		})

		const importedDir = dirname(actualPath)
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
			)
			if (routes) {
				importedRoutesCache.set(cacheKey, routes)
				return routes
			}
		}

		// Export not found in file
		warnings.push({
			type: "general",
			message: `Export '${variableName}' not found in '${actualPath}'. The file was parsed successfully but the variable is not exported as an array.`,
		})
		return null
	} catch (error) {
		if (error instanceof SyntaxError) {
			warnings.push({
				type: "general",
				message: `Syntax error in imported routes file '${actualPath}' while resolving '${variableName}': ${error.message}`,
			})
		} else {
			const message = error instanceof Error ? error.message : String(error)
			warnings.push({
				type: "general",
				message: `Failed to parse imported routes file '${actualPath}' while resolving '${variableName}': ${message}`,
			})
		}
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
				return parseRoutesArray(decl.init, context.baseDir, warnings, context)
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
				return parseRoutesArray(decl.init, context.baseDir, warnings, context)
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
			context,
		)
	}

	return null
}

/**
 * Detect if content is Angular Router based on patterns.
 * Checks for @angular/router import, RouterModule patterns, or Routes type annotation.
 */
export function isAngularRouterContent(content: string): boolean {
	// Check for Angular Router import
	if (content.includes("@angular/router")) {
		return true
	}

	// Check for RouterModule patterns
	if (
		content.includes("RouterModule.forRoot") ||
		content.includes("RouterModule.forChild")
	) {
		return true
	}

	// Check for Routes type annotation: : Routes = or : Routes[
	if (/:\s*Routes\s*[=[]/.test(content)) {
		return true
	}

	return false
}
