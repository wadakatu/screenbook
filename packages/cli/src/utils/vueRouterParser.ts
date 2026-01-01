import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { parse } from "@babel/parser"

/**
 * Parsed route from Vue Router config
 */
export interface ParsedRoute {
	path: string
	name?: string
	component?: string
	children?: ParsedRoute[]
	redirect?: string
}

/**
 * Flattened route with computed properties
 */
export interface FlatRoute {
	/** Full path including parent paths */
	fullPath: string
	/** Route name if defined */
	name?: string
	/** Component file path if available */
	componentPath?: string
	/** Computed screen ID from path */
	screenId: string
	/** Computed screen title from path */
	screenTitle: string
	/** Nesting depth */
	depth: number
}

/**
 * Result of parsing a Vue Router config file
 */
export interface ParseResult {
	routes: ParsedRoute[]
	warnings: string[]
}

/**
 * Parse Vue Router configuration file and extract routes
 */
export function parseVueRouterConfig(filePath: string): ParseResult {
	const absolutePath = resolve(filePath)
	const routesFileDir = dirname(absolutePath)
	const warnings: string[] = []

	// Read file with proper error handling
	let content: string
	try {
		content = readFileSync(absolutePath, "utf-8")
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		throw new Error(`Failed to read routes file "${absolutePath}": ${message}`)
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

/**
 * Resolve relative import path to absolute path
 */
function resolveImportPath(importPath: string, baseDir: string): string {
	if (importPath.startsWith(".")) {
		return resolve(baseDir, importPath)
	}
	return importPath
}

/**
 * Flatten nested routes into a flat list with computed properties
 */
export function flattenRoutes(
	routes: ParsedRoute[],
	parentPath = "",
	depth = 0,
): FlatRoute[] {
	const result: FlatRoute[] = []

	for (const route of routes) {
		// Skip redirect-only routes
		if (route.redirect && !route.component) {
			continue
		}

		// Compute full path
		let fullPath: string
		if (route.path.startsWith("/")) {
			fullPath = route.path
		} else if (parentPath === "/") {
			fullPath = `/${route.path}`
		} else {
			fullPath = parentPath ? `${parentPath}/${route.path}` : `/${route.path}`
		}

		// Normalize path
		fullPath = fullPath.replace(/\/+/g, "/")
		if (fullPath !== "/" && fullPath.endsWith("/")) {
			fullPath = fullPath.slice(0, -1)
		}

		// Only add routes with components (skip abstract parent routes)
		if (route.component || !route.children) {
			result.push({
				fullPath,
				name: route.name,
				componentPath: route.component,
				screenId: pathToScreenId(fullPath),
				screenTitle: pathToScreenTitle(fullPath),
				depth,
			})
		}

		// Process children
		if (route.children) {
			result.push(...flattenRoutes(route.children, fullPath, depth + 1))
		}
	}

	return result
}

/**
 * Convert route path to screen ID
 * /user/:id/profile -> user.id.profile
 */
export function pathToScreenId(path: string): string {
	if (path === "/" || path === "") {
		return "home"
	}

	return path
		.replace(/^\//, "") // Remove leading slash
		.replace(/\/$/, "") // Remove trailing slash
		.split("/")
		.map((segment) => {
			// Convert :param to param
			if (segment.startsWith(":")) {
				return segment.slice(1)
			}
			// Convert *catchall to catchall
			if (segment.startsWith("*")) {
				return segment.slice(1) || "catchall"
			}
			return segment
		})
		.join(".")
}

/**
 * Convert route path to screen title
 * /user/:id/profile -> Profile
 */
export function pathToScreenTitle(path: string): string {
	if (path === "/" || path === "") {
		return "Home"
	}

	const segments = path
		.replace(/^\//, "")
		.replace(/\/$/, "")
		.split("/")
		.filter((s) => !s.startsWith(":") && !s.startsWith("*"))

	const lastSegment = segments[segments.length - 1] || "Home"

	// Convert kebab-case or snake_case to Title Case
	return lastSegment
		.split(/[-_]/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ")
}
