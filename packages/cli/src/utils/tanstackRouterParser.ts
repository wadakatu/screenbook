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

/** Import info containing file path and the original exported name */
interface ImportInfo {
	path: string
	importedName: string
}

/** Cache for imported routes to avoid re-parsing */
const importedRoutesCache = new Map<string, ParsedRoute[]>()

/**
 * Clear the imported routes cache.
 * Useful for testing and watch mode to ensure fresh parsing.
 */
export function clearImportedRoutesCache(): void {
	importedRoutesCache.clear()
}

/**
 * Internal route definition collected from createRoute/createRootRoute calls
 */
interface RouteDefinition {
	variableName: string
	path?: string
	component?: string
	parentVariableName?: string
	isRoot: boolean
	children?: string[] // Variable names of child routes from addChildren
	resolvedChildRoutes?: ParsedRoute[] // Routes resolved from spread operators
}

/**
 * Parse TanStack Router configuration file and extract routes
 */
export function parseTanStackRouterConfig(
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

	// Collect all route definitions from the AST
	const routeMap = new Map<string, RouteDefinition>()

	// Two-pass AST processing is required because TanStack Router uses a function-based API
	// where routes are defined as variables and then composed using .addChildren().
	// Pass 1 must collect all route definitions first, so Pass 2 can resolve variable references.

	// Build spread resolution context for resolving spread operators in addChildren
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

	// First pass: collect all createRoute/createRootRoute calls
	for (const node of ast.program.body) {
		collectRouteDefinitions(node, routeMap, routesFileDir, warnings)
	}

	// Second pass: process addChildren calls to build parent-child relationships
	for (const node of ast.program.body) {
		processAddChildrenCalls(node, routeMap, warnings, resolutionContext)
	}

	// Build the route tree from collected definitions
	const routes = buildRouteTree(routeMap, warnings)

	// Warn if no routes were found
	if (routes.length === 0) {
		warnings.push({
			type: "general",
			message:
				"No routes found. Supported patterns: 'createRootRoute()', 'createRoute()', and '.addChildren([...])'",
		})
	}

	return { routes, warnings }
}

/**
 * Collect route definitions from AST nodes
 */
function collectRouteDefinitions(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	node: any,
	routeMap: Map<string, RouteDefinition>,
	baseDir: string,
	warnings: ParseWarning[],
): void {
	// Handle: const xxxRoute = createRoute({ ... }) or createRootRoute({ ... })
	if (node.type === "VariableDeclaration") {
		for (const decl of node.declarations) {
			if (decl.id.type !== "Identifier") continue

			const variableName = decl.id.name

			// Handle direct createRoute/createRootRoute call
			if (decl.init?.type === "CallExpression") {
				const routeDef = extractRouteFromCallExpression(
					decl.init,
					variableName,
					baseDir,
					warnings,
				)
				if (routeDef) {
					routeMap.set(variableName, routeDef)
				}
			}

			// Handle createRoute(...).lazy(...) pattern
			if (
				decl.init?.type === "CallExpression" &&
				decl.init.callee?.type === "MemberExpression" &&
				decl.init.callee.property?.type === "Identifier" &&
				decl.init.callee.property.name === "lazy"
			) {
				// The createRoute call is in callee.object
				const createRouteCall = decl.init.callee.object
				if (createRouteCall?.type === "CallExpression") {
					const routeDef = extractRouteFromCallExpression(
						createRouteCall,
						variableName,
						baseDir,
						warnings,
					)
					if (routeDef) {
						// Extract lazy import path
						const lazyArg = decl.init.arguments[0]
						if (lazyArg) {
							const lazyPath = extractLazyImportPath(lazyArg, baseDir, warnings)
							if (lazyPath) {
								routeDef.component = lazyPath
							}
						}
						routeMap.set(variableName, routeDef)
					}
				}
			}
		}
	}

	// Handle: export const xxxRoute = createRoute({ ... })
	if (
		node.type === "ExportNamedDeclaration" &&
		node.declaration?.type === "VariableDeclaration"
	) {
		for (const decl of node.declaration.declarations) {
			if (decl.id.type !== "Identifier") continue

			const variableName = decl.id.name

			if (decl.init?.type === "CallExpression") {
				const routeDef = extractRouteFromCallExpression(
					decl.init,
					variableName,
					baseDir,
					warnings,
				)
				if (routeDef) {
					routeMap.set(variableName, routeDef)
				}
			}
		}
	}
}

/**
 * Extract route definition from a CallExpression (createRoute or createRootRoute)
 */
function extractRouteFromCallExpression(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	callNode: any,
	variableName: string,
	baseDir: string,
	warnings: ParseWarning[],
): RouteDefinition | null {
	const callee = callNode.callee

	// Check if it's createRoute or createRootRoute
	let isRoot = false
	let optionsArg = callNode.arguments[0]

	if (callee.type === "Identifier") {
		if (callee.name === "createRootRoute") {
			isRoot = true
		} else if (callee.name === "createRootRouteWithContext") {
			isRoot = true
		} else if (callee.name !== "createRoute") {
			return null
		}
	} else if (callee.type === "CallExpression") {
		// Handle curried form: createRootRouteWithContext<T>()({...})
		const innerCallee = callee.callee
		if (
			innerCallee?.type === "Identifier" &&
			innerCallee.name === "createRootRouteWithContext"
		) {
			isRoot = true
			// Options are in the outer call's arguments
			optionsArg = callNode.arguments[0]
		} else {
			return null
		}
	} else {
		return null
	}

	const routeDef: RouteDefinition = {
		variableName,
		isRoot,
	}
	if (optionsArg?.type === "ObjectExpression") {
		for (const prop of optionsArg.properties) {
			if (prop.type !== "ObjectProperty") continue
			if (prop.key.type !== "Identifier") continue

			const key = prop.key.name

			switch (key) {
				case "path":
					if (prop.value.type === "StringLiteral") {
						// Normalize TanStack Router path: $param -> :param
						routeDef.path = normalizeTanStackPath(prop.value.value)
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
					routeDef.component = extractComponentValue(
						prop.value,
						baseDir,
						warnings,
					)
					break

				case "getParentRoute":
					// Extract parent route variable name from arrow function
					if (prop.value.type === "ArrowFunctionExpression") {
						const body = prop.value.body
						if (body.type === "Identifier") {
							routeDef.parentVariableName = body.name
						} else {
							const line = prop.loc?.start.line
							warnings.push({
								type: "general",
								message: `Dynamic getParentRoute${line ? ` at line ${line}` : ""}. Only static route references can be analyzed.`,
								line,
							})
						}
					}
					break
			}
		}
	}

	return routeDef
}

/**
 * Extract component value from different patterns
 * Returns undefined with a warning for unrecognized patterns
 */
function extractComponentValue(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	node: any,
	baseDir: string,
	warnings: ParseWarning[],
): string | undefined {
	// Direct component reference: component: Home
	if (node.type === "Identifier") {
		return node.name
	}

	// lazyRouteComponent(() => import('./path'))
	if (node.type === "CallExpression") {
		const callee = node.callee
		if (callee.type === "Identifier" && callee.name === "lazyRouteComponent") {
			const importArg = node.arguments[0]
			if (importArg) {
				return extractLazyImportPath(importArg, baseDir, warnings)
			}
			// lazyRouteComponent called without arguments
			const line = node.loc?.start.line
			warnings.push({
				type: "general",
				message: `lazyRouteComponent called without arguments${line ? ` at line ${line}` : ""}. Expected arrow function with import().`,
				line,
			})
			return undefined
		}
		// Other call expressions are not supported
		return undefined
	}

	// Arrow function component: component: () => <Home />
	if (node.type === "ArrowFunctionExpression") {
		// Check if body is JSX
		if (node.body.type === "JSXElement") {
			const openingElement = node.body.openingElement
			if (openingElement?.name?.type === "JSXIdentifier") {
				return openingElement.name.name
			}
			// Handle JSXMemberExpression like <Namespace.Component />
			if (openingElement?.name?.type === "JSXMemberExpression") {
				const line = node.loc?.start.line
				warnings.push({
					type: "general",
					message: `Namespaced JSX component${line ? ` at line ${line}` : ""}. Component extraction not fully supported for member expressions.`,
					line,
				})
				return undefined
			}
		}
		// Block body arrow functions: () => { return <Home /> }
		if (node.body.type === "BlockStatement") {
			const line = node.loc?.start.line
			warnings.push({
				type: "general",
				message: `Arrow function with block body${line ? ` at line ${line}` : ""}. Only concise arrow functions returning JSX directly can be analyzed.`,
				line,
			})
			return undefined
		}
		// JSX Fragment: () => <>...</>
		if (node.body.type === "JSXFragment") {
			const line = node.loc?.start.line
			warnings.push({
				type: "general",
				message: `JSX Fragment detected${line ? ` at line ${line}` : ""}. Cannot extract component name from fragments.`,
				line,
			})
			return undefined
		}
	}

	return undefined
}

/**
 * Extract import path from lazy function patterns
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

		// Direct import: () => import('./path')
		if (body.type === "CallExpression" && body.callee.type === "Import") {
			if (body.arguments[0]?.type === "StringLiteral") {
				return resolveImportPath(body.arguments[0].value, baseDir)
			}
		}

		// Chained: () => import('./path').then(d => d.Route)
		if (
			body.type === "CallExpression" &&
			body.callee.type === "MemberExpression" &&
			body.callee.object?.type === "CallExpression" &&
			body.callee.object.callee?.type === "Import"
		) {
			const importCall = body.callee.object
			if (importCall.arguments[0]?.type === "StringLiteral") {
				return resolveImportPath(importCall.arguments[0].value, baseDir)
			}
		}
	}

	const line = node.loc?.start.line
	warnings.push({
		type: "general",
		message: `Unrecognized lazy pattern (${node.type})${line ? ` at line ${line}` : ""}. Expected arrow function with import().`,
		line,
	})
	return undefined
}

/**
 * Process addChildren calls to establish parent-child relationships
 */
function processAddChildrenCalls(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	node: any,
	routeMap: Map<string, RouteDefinition>,
	warnings: ParseWarning[],
	resolutionContext: SpreadResolutionContext,
): void {
	// Handle: const routeTree = rootRoute.addChildren([...])
	// or: const routeTree = rootRoute.addChildren([indexRoute, aboutRoute.addChildren([...])])
	if (node.type === "VariableDeclaration") {
		for (const decl of node.declarations) {
			processAddChildrenExpression(
				decl.init,
				routeMap,
				warnings,
				resolutionContext,
			)
		}
	}

	// Handle: export const routeTree = rootRoute.addChildren([...])
	if (
		node.type === "ExportNamedDeclaration" &&
		node.declaration?.type === "VariableDeclaration"
	) {
		for (const decl of node.declaration.declarations) {
			processAddChildrenExpression(
				decl.init,
				routeMap,
				warnings,
				resolutionContext,
			)
		}
	}
}

/**
 * Recursively process addChildren expressions
 */
function processAddChildrenExpression(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	expr: any,
	routeMap: Map<string, RouteDefinition>,
	warnings: ParseWarning[],
	resolutionContext: SpreadResolutionContext,
): string | undefined {
	if (!expr) return undefined

	// Handle: parentRoute.addChildren([...])
	if (
		expr.type === "CallExpression" &&
		expr.callee?.type === "MemberExpression" &&
		expr.callee.property?.type === "Identifier" &&
		expr.callee.property.name === "addChildren"
	) {
		// Get parent route variable name
		let parentVarName: string | undefined
		if (expr.callee.object?.type === "Identifier") {
			parentVarName = expr.callee.object.name
		} else if (expr.callee.object?.type === "CallExpression") {
			// Nested addChildren: parentRoute.addChildren([...]).addChildren([...])
			// This is rare but handle recursively
			parentVarName = processAddChildrenExpression(
				expr.callee.object,
				routeMap,
				warnings,
				resolutionContext,
			)
		}

		if (!parentVarName) return undefined

		const parentDef = routeMap.get(parentVarName)
		if (!parentDef) {
			const line = expr.loc?.start.line
			warnings.push({
				type: "general",
				message: `Parent route "${parentVarName}" not found${line ? ` at line ${line}` : ""}. Ensure it's defined with createRoute/createRootRoute.`,
				line,
			})
			return undefined
		}

		// Process children array
		const childrenArg = expr.arguments[0]
		if (childrenArg?.type === "ArrayExpression") {
			const childNames: string[] = []
			const resolvedChildRoutes: ParsedRoute[] = []

			for (const element of childrenArg.elements) {
				if (!element) continue

				// Direct reference: indexRoute
				if (element.type === "Identifier") {
					childNames.push(element.name)
				}
				// Nested addChildren: aboutRoute.addChildren([...])
				else if (element.type === "CallExpression") {
					const nestedParent = processAddChildrenExpression(
						element,
						routeMap,
						warnings,
						resolutionContext,
					)
					if (nestedParent) {
						childNames.push(nestedParent)
					}
				}
				// Spread operator - try to resolve it
				else if (element.type === "SpreadElement") {
					const resolved = resolveSpreadElement(
						element,
						resolutionContext,
						warnings,
					)
					if (resolved) {
						// Successfully resolved - add routes to parent's resolved children
						resolvedChildRoutes.push(...resolved)
						// Add a resolved warning for informational purposes
						const spreadWarning = createSpreadWarning(element)
						spreadWarning.resolved = true
						warnings.push(spreadWarning)
					} else {
						// Resolution failed - add unresolved warning
						const spreadWarning = createSpreadWarning(element)
						spreadWarning.resolved = false
						spreadWarning.resolutionFailureReason = getSpreadFailureReason(
							element,
							resolutionContext,
						)
						warnings.push(spreadWarning)
					}
				}
			}

			parentDef.children = childNames
			if (resolvedChildRoutes.length > 0) {
				parentDef.resolvedChildRoutes = resolvedChildRoutes
			}
		}

		return parentVarName
	}

	return undefined
}

/**
 * Build the route tree from collected definitions
 */
function buildRouteTree(
	routeMap: Map<string, RouteDefinition>,
	warnings: ParseWarning[],
): ParsedRoute[] {
	// Find root routes
	const rootDefs = Array.from(routeMap.values()).filter((def) => def.isRoot)

	if (rootDefs.length === 0) {
		// No explicit root route, try to build from parent relationships
		return buildTreeFromParentRelations(routeMap, warnings)
	}

	// Build tree starting from root routes
	const routes: ParsedRoute[] = []

	for (const rootDef of rootDefs) {
		// Use a Set to track visited routes and detect circular references
		const visited = new Set<string>()
		const rootRoute = buildRouteFromDefinition(
			rootDef,
			routeMap,
			warnings,
			visited,
		)
		if (rootRoute) {
			// If root has children, return only the children (root is typically just a layout)
			// because the root route in TanStack Router serves as a layout wrapper
			if (rootRoute.children && rootRoute.children.length > 0) {
				routes.push(...rootRoute.children)
			} else if (rootRoute.path) {
				routes.push(rootRoute)
			}
		}
	}

	return routes
}

/**
 * Build tree when there's no explicit root route
 * Falls back to finding routes that have no parent relationship defined
 */
function buildTreeFromParentRelations(
	routeMap: Map<string, RouteDefinition>,
	warnings: ParseWarning[],
): ParsedRoute[] {
	// Find routes without parents (top-level routes)
	const topLevelDefs = Array.from(routeMap.values()).filter(
		(def) => !def.parentVariableName && !def.isRoot,
	)

	const routes: ParsedRoute[] = []

	for (const def of topLevelDefs) {
		const visited = new Set<string>()
		const route = buildRouteFromDefinition(def, routeMap, warnings, visited)
		if (route) {
			routes.push(route)
		}
	}

	return routes
}

/**
 * Build a ParsedRoute from a RouteDefinition
 * @param visited - Set of visited variable names for circular reference detection
 */
function buildRouteFromDefinition(
	def: RouteDefinition,
	routeMap: Map<string, RouteDefinition>,
	warnings: ParseWarning[],
	visited: Set<string>,
): ParsedRoute | null {
	// Circular reference detection
	if (visited.has(def.variableName)) {
		warnings.push({
			type: "general",
			message: `Circular reference detected: route "${def.variableName}" references itself in the route tree.`,
		})
		return null
	}
	visited.add(def.variableName)

	const route: ParsedRoute = {
		path: def.path ?? "",
		component: def.component,
	}

	// Process children (both from createRoute definitions and resolved spreads)
	const children: ParsedRoute[] = []

	// Add children from createRoute definitions
	if (def.children && def.children.length > 0) {
		for (const childName of def.children) {
			const childDef = routeMap.get(childName)
			if (childDef) {
				const childRoute = buildRouteFromDefinition(
					childDef,
					routeMap,
					warnings,
					visited,
				)
				if (childRoute) {
					children.push(childRoute)
				}
			} else {
				warnings.push({
					type: "general",
					message: `Child route "${childName}" not found. Ensure it's defined with createRoute.`,
				})
			}
		}
	}

	// Add children from resolved spread operators
	if (def.resolvedChildRoutes && def.resolvedChildRoutes.length > 0) {
		children.push(...def.resolvedChildRoutes)
	}

	if (children.length > 0) {
		route.children = children
	}

	return route
}

/**
 * Normalize TanStack Router path syntax to standard format
 * /$ (trailing catch-all) -> /*
 * $  (standalone splat)   -> *
 * $param (dynamic segment) -> :param
 */
function normalizeTanStackPath(path: string): string {
	return (
		path
			// Convert catch-all: $ at end -> *
			.replace(/\/\$$/, "/*")
			// Convert single $ to * (splat route)
			.replace(/^\$$/, "*")
			// Convert $param to :param
			.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, ":$1")
	)
}

/**
 * Detect if content is TanStack Router based on patterns
 */
export function isTanStackRouterContent(content: string): boolean {
	// Check for TanStack Router specific imports
	if (content.includes("@tanstack/react-router")) {
		return true
	}

	// Check for createRootRoute pattern
	if (content.includes("createRootRoute")) {
		return true
	}

	// Check for createRoute with getParentRoute (TanStack Router specific)
	if (content.includes("createRoute") && content.includes("getParentRoute")) {
		return true
	}

	// Check for lazyRouteComponent (TanStack Router specific)
	if (content.includes("lazyRouteComponent")) {
		return true
	}

	// Check for addChildren pattern (TanStack Router specific)
	if (/\.addChildren\s*\(/.test(content)) {
		return true
	}

	return false
}

/**
 * Build a map of route array variables defined in the same file.
 * Scans for variable declarations (const, let, var) initialized with array expressions.
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
): Map<string, ImportInfo> {
	const importMap = new Map<string, ImportInfo>()

	for (const node of body) {
		if (node.type !== "ImportDeclaration") continue

		const source = node.source.value
		if (typeof source !== "string") continue

		const resolvedPath = resolveImportPath(source, baseDir)
		if (!resolvedPath) continue

		for (const specifier of node.specifiers) {
			const localName = specifier.local?.name
			if (!localName) continue

			if (localName.toLowerCase().includes("route")) {
				// For aliased imports: `import { config as adminRoutes }`,
				// specifier.imported.name is 'config', specifier.local.name is 'adminRoutes'
				const importedName =
					specifier.type === "ImportSpecifier"
						? specifier.imported?.name || localName
						: localName
				importMap.set(localName, { path: resolvedPath, importedName })
			}
		}
	}

	return importMap
}

/**
 * Parse route objects from an array expression.
 * Used for resolving routes from imported files or local variables.
 */
function parseRoutesFromArray(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	arrayNode: any,
	baseDir: string,
	warnings: ParseWarning[],
	resolutionContext?: SpreadResolutionContext,
): ParsedRoute[] {
	const routes: ParsedRoute[] = []

	for (const element of arrayNode.elements) {
		if (!element) continue

		// Handle spread elements with resolution
		if (element.type === "SpreadElement") {
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
			const route = parseRouteObjectFromArray(element, baseDir, warnings)
			if (route) {
				routes.push(route)
			}
		}
	}

	return routes
}

/**
 * Parse a single route object from an array element.
 * This handles simple route objects (not the TanStack Router createRoute pattern).
 */
function parseRouteObjectFromArray(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	objectNode: any,
	baseDir: string,
	warnings: ParseWarning[],
): ParsedRoute | null {
	let path: string | undefined
	let component: string | undefined

	for (const prop of objectNode.properties) {
		if (prop.type !== "ObjectProperty") continue
		if (prop.key.type !== "Identifier") continue

		const key = prop.key.name

		switch (key) {
			case "path":
				if (prop.value.type === "StringLiteral") {
					path = normalizeTanStackPath(prop.value.value)
				}
				break

			case "component":
				component = extractComponentValue(prop.value, baseDir, warnings)
				break
		}
	}

	if (!path) {
		return null
	}

	return { path, component }
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
				: parseRoutesFromArray(node, context.baseDir, warnings, context)

		case "Identifier":
			return resolveIdentifierSpread(node.name, context, warnings)

		case "ConditionalExpression":
			return resolveConditionalSpread(node, context, warnings)

		case "LogicalExpression":
			return resolveLogicalSpread(node, context, warnings)

		// Handle TypeScript type assertions: ...(routes as any) or ...<any>routes
		case "TSAsExpression":
		case "TSTypeAssertion":
			return resolveSpreadArgument(node.expression, context, warnings)

		default:
			// Add warning for unsupported spread argument types
			warnings.push({
				type: "general",
				message: `Unsupported spread argument type '${node.type}'. Only identifiers, arrays, conditionals, and logical expressions are supported.`,
				line: node.loc?.start.line,
			})
			return null
	}
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
		return parseRoutesFromArray(localArray, context.baseDir, warnings, context)
	}

	// Try imported variable
	const importInfo = context.importedRouteVariables.get(variableName) as
		| ImportInfo
		| undefined
	if (importInfo) {
		// Use the original imported name to look up in the file
		return resolveImportedRoutes(
			importInfo.path,
			importInfo.importedName,
			context,
			warnings,
		)
	}

	return null
}

/**
 * Collect routes from multiple AST nodes, merging results.
 * Returns null only if no nodes could be resolved.
 *
 * @param nodes - Array of AST nodes to resolve (e.g., branches of a conditional)
 * @param context - Spread resolution context
 * @param warnings - Array to append warnings to
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
 *
 * **Limitation**: For `&&`, this assumes the pattern `condition && routes` where the left operand
 * is a boolean condition. If both operands contain route arrays (e.g., `routes && moreRoutes`),
 * only the right side will be captured.
 *
 * **Note**: The `??` (nullish coalescing) operator is not supported and will generate a warning.
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
			warnings.push({
				type: "general",
				message: `Unsupported logical operator '${logicalExpr.operator}' in spread expression. Only '&&' and '||' are supported.`,
				line: logicalExpr.loc?.start.line,
			})
			return null
	}
}

/**
 * Get a descriptive failure reason for an unresolved spread element.
 *
 * Returns human-readable messages that help users understand why resolution failed:
 * - For identifiers: whether variable is missing or has wrong naming convention
 * - For expressions: which expression type couldn't be resolved
 * - For function calls: explains static analysis limitation
 *
 * @param element - The SpreadElement AST node
 * @param context - Resolution context (may be undefined if not available)
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
			plugins: ["typescript", "jsx"],
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

		// Collect named exports (e.g., `export { foo, bar }`)
		const namedExports = collectNamedExports(ast.program.body)

		// Look for the exported variable in the AST
		for (const node of ast.program.body) {
			const routes = extractRoutesFromExport(
				node,
				variableName,
				nestedContext,
				warnings,
				namedExports,
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
 * Collect named exports from a file (e.g., `export { foo, bar }`).
 * Returns a set of exported variable names.
 */
function collectNamedExports(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	body: any[],
): Set<string> {
	const exports = new Set<string>()

	for (const node of body) {
		// Handle: export { foo, bar }
		if (node.type === "ExportNamedDeclaration" && !node.declaration) {
			for (const specifier of node.specifiers) {
				if (specifier.type === "ExportSpecifier" && specifier.local?.name) {
					exports.add(specifier.local.name)
				}
			}
		}
	}

	return exports
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
	namedExports: Set<string>,
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
				return parseRoutesFromArray(
					decl.init,
					context.baseDir,
					warnings,
					context,
				)
			}
		}
	}

	// Handle: const varName = [...]; (for later export { varName })
	// Only match if the variable is in the named exports set
	if (node.type === "VariableDeclaration" && namedExports.has(variableName)) {
		for (const decl of node.declarations) {
			if (
				decl.id.type === "Identifier" &&
				decl.id.name === variableName &&
				decl.init?.type === "ArrayExpression"
			) {
				return parseRoutesFromArray(
					decl.init,
					context.baseDir,
					warnings,
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
		return parseRoutesFromArray(
			node.declaration,
			context.baseDir,
			warnings,
			context,
		)
	}

	return null
}
