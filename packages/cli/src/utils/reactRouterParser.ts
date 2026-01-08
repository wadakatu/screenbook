import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { parse } from "@babel/parser"
import { isAngularRouterContent } from "./angularRouterParser.js"
import {
	type ParsedRoute,
	type ParseResult,
	type ParseWarning,
	type RouterType,
	resolveImportPath,
} from "./routeParserUtils.js"
import { isSolidRouterContent } from "./solidRouterParser.js"
import { isTanStackRouterContent } from "./tanstackRouterParser.js"

// Re-export shared types
export type { ParsedRoute, ParseResult, ParseWarning, RouterType }
// Re-export router detection for convenience
export { isAngularRouterContent, isSolidRouterContent, isTanStackRouterContent }

/**
 * Router factory function names to detect
 */
const ROUTER_FACTORY_NAMES = [
	"createBrowserRouter",
	"createHashRouter",
	"createMemoryRouter",
]

/**
 * Parse React Router configuration file and extract routes
 */
export function parseReactRouterConfig(
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
		// Handle: const router = createBrowserRouter([...])
		if (node.type === "VariableDeclaration") {
			for (const decl of node.declarations) {
				if (decl.init?.type === "CallExpression") {
					const callee = decl.init.callee
					if (
						callee.type === "Identifier" &&
						ROUTER_FACTORY_NAMES.includes(callee.name)
					) {
						const firstArg = decl.init.arguments[0]
						if (firstArg?.type === "ArrayExpression") {
							const parsed = parseRoutesArray(firstArg, routesFileDir, warnings)
							routes.push(...parsed)
						}
					}
				}
			}
		}

		// Handle: export const router = createBrowserRouter([...])
		// and: export const routes = [...]
		if (
			node.type === "ExportNamedDeclaration" &&
			node.declaration?.type === "VariableDeclaration"
		) {
			for (const decl of node.declaration.declarations) {
				// Handle: export const router = createBrowserRouter([...])
				if (decl.init?.type === "CallExpression") {
					const callee = decl.init.callee
					if (
						callee.type === "Identifier" &&
						ROUTER_FACTORY_NAMES.includes(callee.name)
					) {
						const firstArg = decl.init.arguments[0]
						if (firstArg?.type === "ArrayExpression") {
							const parsed = parseRoutesArray(firstArg, routesFileDir, warnings)
							routes.push(...parsed)
						}
					}
				}

				// Handle: export const routes = [...]
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

		// Handle: const routes = [...]; (for later export)
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

		// Handle: export default [...] satisfies RouteObject[]
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
				"No routes found. Supported patterns: 'createBrowserRouter([...])', 'export const routes = [...]', or 'export default [...]'",
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
			const route = parseRouteObject(element, baseDir, warnings)
			if (route) {
				routes.push(route)
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
): ParsedRoute | null {
	const route: ParsedRoute = {
		path: "",
	}
	let isIndexRoute = false
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
				} else {
					const line = prop.loc?.start.line
					warnings.push({
						type: "general",
						message: `Dynamic path value (${prop.value.type})${line ? ` at line ${line}` : ""}. Only string literal paths can be statically analyzed.`,
						line,
					})
				}
				break

			case "index":
				if (prop.value.type === "BooleanLiteral" && prop.value.value === true) {
					isIndexRoute = true
				}
				break

			case "element":
				route.component = extractComponentFromJSX(prop.value, warnings)
				break

			case "Component":
				if (prop.value.type === "Identifier") {
					route.component = prop.value.name
				}
				break

			case "lazy": {
				const lazyPath = extractLazyImportPath(prop.value, baseDir, warnings)
				if (lazyPath) {
					route.component = lazyPath
				}
				break
			}

			case "children":
				if (prop.value.type === "ArrayExpression") {
					route.children = parseRoutesArray(prop.value, baseDir, warnings)
				}
				break
		}
	}

	// Handle index routes
	if (isIndexRoute) {
		route.path = ""
		return route
	}

	// Skip routes without path (layout wrappers without path)
	// These are parent routes that only serve as layout containers
	if (!hasPath && !isIndexRoute) {
		// If it has children, process them with empty parent path contribution
		if (route.children && route.children.length > 0) {
			// Return a route with empty path to act as layout
			route.path = ""
			return route
		}
		return null
	}

	return route
}

/**
 * Extract component name from JSX element
 * element: <Dashboard /> -> "Dashboard"
 */
function extractComponentFromJSX(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	node: any,
	warnings: ParseWarning[],
): string | undefined {
	if (node.type === "JSXElement") {
		const openingElement = node.openingElement
		if (openingElement?.name?.type === "JSXIdentifier") {
			return openingElement.name.name
		}
		if (openingElement?.name?.type === "JSXMemberExpression") {
			// Handle <Namespace.Component />
			const parts: string[] = []
			let current = openingElement.name
			while (current) {
				if (current.type === "JSXIdentifier") {
					parts.unshift(current.name)
					break
				}
				if (current.type === "JSXMemberExpression") {
					if (current.property?.type === "JSXIdentifier") {
						parts.unshift(current.property.name)
					}
					current = current.object
				} else {
					break
				}
			}
			return parts.join(".")
		}

		// Check if it has children (wrapper component)
		if (
			node.children &&
			node.children.length > 0 &&
			openingElement?.name?.type === "JSXIdentifier"
		) {
			const wrapperName = openingElement.name.name
			// Find the first JSX child
			for (const child of node.children) {
				if (child.type === "JSXElement") {
					const childComponent = extractComponentFromJSX(child, warnings)
					if (childComponent) {
						warnings.push({
							type: "general",
							message: `Wrapper component detected: <${wrapperName}>. Using wrapper name for screen.`,
						})
						return wrapperName
					}
				}
			}
		}
	}

	// Handle JSXFragment
	if (node.type === "JSXFragment") {
		const line = node.loc?.start.line
		warnings.push({
			type: "general",
			message: `JSX Fragment detected${line ? ` at line ${line}` : ""}. Cannot extract component name from fragments. Consider wrapping in a named component.`,
			line,
		})
		return undefined
	}

	// Catch-all for unrecognized element patterns
	if (node) {
		const line = node.loc?.start.line
		warnings.push({
			type: "general",
			message: `Unrecognized element pattern (${node.type})${line ? ` at line ${line}` : ""}. Component will not be extracted.`,
			line,
		})
	}
	return undefined
}

/**
 * Extract import path from lazy function
 * lazy: () => import("./pages/Dashboard") -> resolved path
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
				message: `Lazy import with dynamic path${line ? ` at line ${line}` : ""}. Only string literal imports can be statically analyzed.`,
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
 * Detect if content is React Router based on patterns
 */
export function isReactRouterContent(content: string): boolean {
	// Check for React Router specific patterns
	if (
		content.includes("createBrowserRouter") ||
		content.includes("createHashRouter") ||
		content.includes("createMemoryRouter") ||
		content.includes("RouteObject")
	) {
		return true
	}

	// Check for JSX element pattern in routes
	if (/element:\s*</.test(content)) {
		return true
	}

	// Check for Component property pattern (uppercase)
	if (/Component:\s*[A-Z]/.test(content)) {
		return true
	}

	return false
}

/**
 * Detect if content is Vue Router based on patterns
 */
export function isVueRouterContent(content: string): boolean {
	// Check for Vue Router specific patterns
	if (
		content.includes("RouteRecordRaw") ||
		content.includes("vue-router") ||
		content.includes(".vue")
	) {
		return true
	}

	return false
}

/**
 * Detect router type from file content.
 * Detection order: TanStack Router -> Solid Router -> Angular Router -> React Router -> Vue Router.
 * This order ensures more specific patterns are checked before more generic ones.
 */
export function detectRouterType(content: string): RouterType {
	// Check TanStack Router first (more specific patterns)
	if (isTanStackRouterContent(content)) {
		return "tanstack-router"
	}
	// Check Solid Router before React Router (both use similar patterns)
	if (isSolidRouterContent(content)) {
		return "solid-router"
	}
	// Check Angular Router before React Router (distinct patterns)
	if (isAngularRouterContent(content)) {
		return "angular-router"
	}
	if (isReactRouterContent(content)) {
		return "react-router"
	}
	if (isVueRouterContent(content)) {
		return "vue-router"
	}
	return "unknown"
}
