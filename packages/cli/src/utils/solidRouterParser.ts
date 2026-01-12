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
export type { ParsedRoute, ParseResult }

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
		// Handle: const routes = [...]
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
						resolutionContext,
					)
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

		// Handle: export default [...]
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
			const parsedRoutes = parseRouteObject(
				element,
				baseDir,
				warnings,
				resolutionContext,
			)
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
	resolutionContext?: SpreadResolutionContext,
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
					children = parseRoutesArray(
						prop.value,
						baseDir,
						warnings,
						resolutionContext,
					)
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

/** Import info containing file path and the original exported name */
interface ImportInfo {
	path: string
	importedName: string
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
				return parseRoutesArray(decl.init, context.baseDir, warnings, context)
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
