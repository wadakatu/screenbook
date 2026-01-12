import { resolve } from "node:path"
import type { GenerateConfig } from "@screenbook/core"

/**
 * Supported router types for auto-detection.
 * Detection order: TanStack Router -> Solid Router -> Angular Router -> React Router -> Vue Router.
 */
export type RouterType =
	| "react-router"
	| "vue-router"
	| "tanstack-router"
	| "solid-router"
	| "angular-router"
	| "unknown"

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
	/** Suggestions for alternative IDs (when unmappedParameterStrategy is "warn") */
	suggestions?: string[]
}

/**
 * Options for screen ID generation from route paths.
 * Alias for GenerateConfig from @screenbook/core.
 */
export type PathToScreenIdOptions = GenerateConfig

/**
 * Result of screen ID generation
 */
export interface PathToScreenIdResult {
	/** The generated screen ID */
	screenId: string
	/** Suggestions for alternative IDs (when strategy is "warn") */
	suggestions?: string[]
}

/**
 * Spread operator warning with optional variable name context
 */
export interface SpreadWarning {
	/** Warning type identifier */
	type: "spread"
	/** Human-readable warning message */
	message: string
	/** Line number where the warning occurred */
	line?: number
	/** Variable name for spread operators (e.g., 'devRoutes' from '...devRoutes') */
	variableName?: string
	/** Whether the spread was successfully resolved */
	resolved?: boolean
	/** Reason why resolution failed (if applicable) */
	resolutionFailureReason?: string
}

/**
 * Context for spread resolution during route parsing
 */
export interface SpreadResolutionContext {
	/** Map of local variable names to their route array AST nodes */
	localRouteVariables: Map<string, unknown>
	/**
	 * Map of imported variable names to their resolution info.
	 * The value can be:
	 * - A string (file path) for simple imports
	 * - An object with path and importedName for aliased imports
	 */
	importedRouteVariables: Map<string, unknown>
	/** Base directory for resolving imports */
	baseDir: string
	/** Maximum depth for recursive file resolution (default: 3) */
	maxDepth: number
	/** Current recursion depth */
	currentDepth: number
}

/**
 * General warning without spread-specific context
 */
export interface GeneralWarning {
	/** Warning type identifier */
	type: "general"
	/** Human-readable warning message */
	message: string
	/** Line number where the warning occurred */
	line?: number
}

/**
 * Structured warning from router config parsing (discriminated union)
 */
export type ParseWarning = SpreadWarning | GeneralWarning

/**
 * Warning type for parser warnings (derived from ParseWarning union)
 */
export type ParseWarningType = ParseWarning["type"]

/**
 * Result of parsing a router config file
 */
export interface ParseResult {
	routes: ParsedRoute[]
	warnings: ParseWarning[]
}

/**
 * Create a spread warning from an AST element.
 * Extracts line number and variable name for better error messages.
 * @param element - AST element (SpreadElement)
 * @returns SpreadWarning object
 */
export function createSpreadWarning(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	element: any,
): SpreadWarning {
	const line = element.loc?.start.line
	const variableName =
		element.argument?.type === "Identifier" ? element.argument.name : undefined

	return {
		type: "spread",
		message: `Spread operator detected${line ? ` at line ${line}` : ""}`,
		line,
		variableName,
	}
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
	options: PathToScreenIdOptions = {},
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
			const { screenId, suggestions } = pathToScreenId(fullPath, options)
			result.push({
				fullPath,
				name: route.name,
				componentPath: route.component,
				screenId,
				screenTitle: pathToScreenTitle(fullPath),
				depth,
				suggestions,
			})
		}

		// Process children
		if (route.children) {
			result.push(
				...flattenRoutes(route.children, fullPath, depth + 1, options),
			)
		}
	}

	return result
}

/**
 * Check if a segment is a Vue Router catch-all pattern.
 * Examples: :pathMatch(.*)*, :catchAll(.*)*, :path(.*)
 */
function isVueCatchallPattern(segment: string): boolean {
	return /^:[a-zA-Z_][a-zA-Z0-9_]*\(.*\)\*?$/.test(segment)
}

/**
 * Action segments that provide semantic context.
 * When a parameter is followed by one of these, the parameter is preserved.
 */
const ACTION_SEGMENTS = new Set([
	"edit",
	"new",
	"create",
	"delete",
	"settings",
	"view",
	"update",
])

/**
 * Check if a segment is an action segment
 */
function isActionSegment(segment: string | undefined): boolean {
	return segment !== undefined && ACTION_SEGMENTS.has(segment.toLowerCase())
}

/**
 * Infer semantic alternatives for a parameter
 */
function inferSemanticAlternatives(param: string, isLast: boolean): string[] {
	const alternatives: string[] = []

	if (isLast) {
		alternatives.push("detail", "view")
	}

	// Extract entity name from :xxxId pattern
	const entityMatch = param.match(/^:(\w+)Id$/i)
	if (entityMatch?.[1]) {
		alternatives.push(entityMatch[1].toLowerCase())
	}

	return alternatives
}

/**
 * Resolve a parameter segment to a screen ID segment
 */
function resolveParameter(
	segment: string,
	isLastSegment: boolean,
	nextSegment: string | undefined,
	options: PathToScreenIdOptions,
): { resolved: string; suggestion?: string } {
	// 1. Check custom mapping first (highest priority)
	const mappingKey = segment as `:${string}`
	if (options.parameterMapping?.[mappingKey]) {
		return { resolved: options.parameterMapping[mappingKey] }
	}

	// 2. Apply smart defaults if enabled
	if (options.smartParameterNaming) {
		// Generic :id at path end -> "detail"
		if (segment === ":id" && isLastSegment) {
			return { resolved: "detail" }
		}

		// :xxxId pattern at path end -> extract entity name
		const entityMatch = segment.match(/^:(\w+)Id$/i)
		if (entityMatch?.[1] && isLastSegment) {
			return { resolved: entityMatch[1].toLowerCase() }
		}

		// Parameter followed by action segment -> preserve for context
		if (!isLastSegment && isActionSegment(nextSegment)) {
			return { resolved: segment.slice(1) }
		}

		// Generic :id not at end with smart naming -> "detail" only if truly last meaningful segment
		if (segment === ":id" && !isActionSegment(nextSegment)) {
			return { resolved: "detail" }
		}
	}

	// 3. Handle based on unmapped strategy
	const cleanParam = segment.slice(1)

	switch (options.unmappedParameterStrategy) {
		case "detail":
			return { resolved: "detail" }
		case "warn": {
			const alternatives = inferSemanticAlternatives(segment, isLastSegment)
			return {
				resolved: cleanParam,
				suggestion:
					alternatives.length > 0
						? `Consider renaming to: ${alternatives.join(", ")}`
						: undefined,
			}
		}
		default:
			// "preserve" or undefined - keep the parameter name as-is
			return { resolved: cleanParam }
	}
}

/**
 * Convert route path to screen ID with options
 * /user/:id/profile -> user.id.profile (default)
 * /user/:id/profile -> user.detail.profile (with smartParameterNaming)
 */
export function pathToScreenId(
	path: string,
	options: PathToScreenIdOptions = {},
): PathToScreenIdResult {
	if (path === "/" || path === "") {
		return { screenId: "home" }
	}

	const segments = path
		.replace(/^\//, "") // Remove leading slash
		.replace(/\/$/, "") // Remove trailing slash
		.split("/")

	const resolvedSegments: string[] = []
	const allSuggestions: string[] = []

	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i]
		if (!segment) continue

		const isLast = i === segments.length - 1
		const nextSegment = segments[i + 1]

		if (segment.startsWith(":")) {
			// Check for Vue Router catch-all pattern first
			if (isVueCatchallPattern(segment)) {
				resolvedSegments.push("not-found")
			} else {
				// Parameter segment
				const { resolved, suggestion } = resolveParameter(
					segment,
					isLast,
					nextSegment,
					options,
				)
				resolvedSegments.push(resolved)
				if (suggestion) {
					allSuggestions.push(suggestion)
				}
			}
		} else if (segment.startsWith("*")) {
			// Catchall segment
			if (segment === "**") {
				resolvedSegments.push("catchall")
			} else {
				resolvedSegments.push(segment.slice(1) || "catchall")
			}
		} else {
			// Static segment
			resolvedSegments.push(segment)
		}
	}

	return {
		screenId: resolvedSegments.join("."),
		suggestions: allSuggestions.length > 0 ? allSuggestions : undefined,
	}
}

/**
 * Convert route path to screen title
 * /user/:id/profile -> Profile
 */
export function pathToScreenTitle(path: string): string {
	if (path === "/" || path === "") {
		return "Home"
	}

	const allSegments = path.replace(/^\//, "").replace(/\/$/, "").split("/")

	// Check if the last segment is a Vue Router catch-all pattern
	const lastRawSegment = allSegments[allSegments.length - 1]
	if (lastRawSegment && isVueCatchallPattern(lastRawSegment)) {
		return "Not Found"
	}

	const segments = allSegments.filter(
		(s) => !s.startsWith(":") && !s.startsWith("*"),
	)

	const lastSegment = segments[segments.length - 1] || "Home"

	// Convert kebab-case or snake_case to Title Case
	return lastSegment
		.split(/[-_]/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ")
}
