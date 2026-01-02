import { resolve } from "node:path"

/**
 * Parsed route from router config (Vue Router, React Router, etc.)
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
 * Result of parsing a router config file
 */
export interface ParseResult {
	routes: ParsedRoute[]
	warnings: string[]
}

/**
 * Resolve relative import path to absolute path
 */
export function resolveImportPath(importPath: string, baseDir: string): string {
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

		// Handle empty path (index routes)
		if (fullPath === "") {
			fullPath = parentPath || "/"
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
			// Convert *catchall or ** to catchall
			if (segment.startsWith("*")) {
				// Handle ** (Angular) as catchall
				if (segment === "**") {
					return "catchall"
				}
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
