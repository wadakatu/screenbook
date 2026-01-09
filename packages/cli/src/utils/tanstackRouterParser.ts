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
export type { ParsedRoute, ParseResult, ParseWarning }

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

	// First pass: collect all createRoute/createRootRoute calls
	for (const node of ast.program.body) {
		collectRouteDefinitions(node, routeMap, routesFileDir, warnings)
	}

	// Second pass: process addChildren calls to build parent-child relationships
	for (const node of ast.program.body) {
		processAddChildrenCalls(node, routeMap, warnings)
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
): void {
	// Handle: const routeTree = rootRoute.addChildren([...])
	// or: const routeTree = rootRoute.addChildren([indexRoute, aboutRoute.addChildren([...])])
	if (node.type === "VariableDeclaration") {
		for (const decl of node.declarations) {
			processAddChildrenExpression(decl.init, routeMap, warnings)
		}
	}

	// Handle: export const routeTree = rootRoute.addChildren([...])
	if (
		node.type === "ExportNamedDeclaration" &&
		node.declaration?.type === "VariableDeclaration"
	) {
		for (const decl of node.declaration.declarations) {
			processAddChildrenExpression(decl.init, routeMap, warnings)
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
					)
					if (nestedParent) {
						childNames.push(nestedParent)
					}
				}
				// Spread operator
				else if (element.type === "SpreadElement") {
					warnings.push(createSpreadWarning(element))
				}
			}

			parentDef.children = childNames
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

	// Process children
	if (def.children && def.children.length > 0) {
		const children: ParsedRoute[] = []
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
		if (children.length > 0) {
			route.children = children
		}
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
