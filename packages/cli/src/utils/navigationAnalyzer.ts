import { parse } from "@babel/parser"
import { pathToScreenId } from "./routeParserUtils.js"

/**
 * Detected navigation target from a source file
 */
export interface DetectedNavigation {
	/** The target path (e.g., "/users", "/billing/invoices/:id") */
	path: string
	/** Converted screen ID using pathToScreenId */
	screenId: string
	/** Navigation method type */
	type: "link" | "router-push" | "navigate" | "redirect"
	/** Line number where detected */
	line: number
}

/**
 * Factory function to create DetectedNavigation with proper screenId derivation.
 * Ensures the screenId is always correctly derived from the path.
 */
export function createDetectedNavigation(
	path: string,
	type: DetectedNavigation["type"],
	line: number,
): DetectedNavigation {
	// Strip query params and hash from path before converting to screenId
	const pathWithoutQuery = path.split("?")[0] ?? path
	const cleanPath = pathWithoutQuery.split("#")[0] ?? pathWithoutQuery
	return {
		path,
		screenId: pathToScreenId(cleanPath),
		type,
		line,
	}
}

/**
 * Result of analyzing a file for navigation
 */
export interface NavigationAnalysisResult {
	/** Detected navigation targets */
	readonly navigations: readonly DetectedNavigation[]
	/** Any warnings during analysis */
	readonly warnings: readonly string[]
}

/**
 * Result of framework detection
 */
export interface FrameworkDetectionResult {
	/** Detected or default framework */
	readonly framework: NavigationFramework
	/** Whether the framework was explicitly detected (false means defaulted to Next.js) */
	readonly detected: boolean
}

/**
 * Navigation framework to detect
 */
export type NavigationFramework = "nextjs" | "react-router" | "vue-router"

/**
 * Analyze a file's content for navigation patterns.
 *
 * Supports:
 * - Next.js: `<Link href="/path">`, `router.push("/path")`, `router.replace("/path")`, `redirect("/path")`
 * - React Router: `<Link to="/path">`, `navigate("/path")`
 * - Vue Router: `router.push("/path")`, `router.replace("/path")`, `router.push({ path: "/path" })`
 *
 * @param content - The file content to analyze
 * @param framework - The navigation framework to detect
 * @returns Analysis result with detected navigations and warnings
 */
export function analyzeNavigation(
	content: string,
	framework: NavigationFramework,
): NavigationAnalysisResult {
	const navigations: DetectedNavigation[] = []
	const warnings: string[] = []

	// Parse with Babel
	let ast: ReturnType<typeof parse>
	try {
		ast = parse(content, {
			sourceType: "module",
			plugins: ["typescript", "jsx"],
		})
	} catch (error) {
		if (error instanceof SyntaxError) {
			warnings.push(`Syntax error during navigation analysis: ${error.message}`)
			return { navigations, warnings }
		}
		const message = error instanceof Error ? error.message : String(error)
		warnings.push(`Failed to parse file for navigation analysis: ${message}`)
		return { navigations, warnings }
	}

	// Walk the AST with error handling
	try {
		walkNode(ast.program, (node) => {
			// Detect JSX Link components
			if (node.type === "JSXOpeningElement") {
				const linkNav = extractLinkNavigation(node, framework, warnings)
				if (linkNav) {
					navigations.push(linkNav)
				}
			}

			// Detect call expressions (router.push, router.replace, navigate, redirect)
			if (node.type === "CallExpression") {
				const callNav = extractCallNavigation(node, framework, warnings)
				if (callNav) {
					navigations.push(callNav)
				}
			}
		})
	} catch (error) {
		if (error instanceof RangeError) {
			warnings.push(
				`File too complex for navigation analysis (${error.message}). Consider simplifying the file structure.`,
			)
			return { navigations, warnings }
		}
		const message = error instanceof Error ? error.message : String(error)
		const errorType = error?.constructor?.name ?? "Unknown"
		warnings.push(`Unexpected ${errorType} during AST traversal: ${message}`)
		return { navigations, warnings }
	}

	// Remove duplicates (same screenId)
	const seen = new Set<string>()
	const uniqueNavigations = navigations.filter((nav) => {
		if (seen.has(nav.screenId)) {
			return false
		}
		seen.add(nav.screenId)
		return true
	})

	return { navigations: uniqueNavigations, warnings }
}

/**
 * Extract navigation from JSX Link component
 */
function extractLinkNavigation(
	// biome-ignore lint/suspicious/noExplicitAny: Babel AST nodes have complex union types that are impractical to fully type
	node: any,
	framework: NavigationFramework,
	warnings: string[],
): DetectedNavigation | null {
	// Check if it's a Link component
	if (node.name?.type !== "JSXIdentifier") {
		return null
	}

	const componentName = node.name.name
	if (componentName !== "Link") {
		return null
	}

	// Determine which attribute to look for based on framework
	const attrName = framework === "nextjs" ? "href" : "to"

	for (const attr of node.attributes || []) {
		if (
			attr.type === "JSXAttribute" &&
			attr.name?.type === "JSXIdentifier" &&
			attr.name.name === attrName
		) {
			// String literal: href="/path"
			if (attr.value?.type === "StringLiteral") {
				const path = attr.value.value
				if (isValidInternalPath(path)) {
					return createDetectedNavigation(
						path,
						"link",
						node.loc?.start.line ?? 0,
					)
				}
			}

			// JSX expression: href={"/path"} or href={`/path`}
			if (attr.value?.type === "JSXExpressionContainer") {
				const expr = attr.value.expression

				// Simple string literal in expression
				if (expr.type === "StringLiteral") {
					const path = expr.value
					if (isValidInternalPath(path)) {
						return createDetectedNavigation(
							path,
							"link",
							node.loc?.start.line ?? 0,
						)
					}
				}

				// Template literal with no expressions (static template)
				if (
					expr.type === "TemplateLiteral" &&
					expr.expressions.length === 0 &&
					expr.quasis.length === 1
				) {
					const path = expr.quasis[0].value.cooked
					if (path && isValidInternalPath(path)) {
						return createDetectedNavigation(
							path,
							"link",
							node.loc?.start.line ?? 0,
						)
					}
				}

				// Dynamic expression - add warning with actionable guidance
				const line = node.loc?.start.line ?? 0
				warnings.push(
					`Dynamic Link ${attrName} at line ${line} cannot be statically analyzed. Add the target screen ID manually to the 'next' field in screen.meta.ts.`,
				)
			}
		}
	}

	return null
}

/**
 * Extract navigation from function calls (router.push, router.replace, navigate, redirect)
 */
function extractCallNavigation(
	// biome-ignore lint/suspicious/noExplicitAny: Babel AST nodes have complex union types that are impractical to fully type
	node: any,
	framework: NavigationFramework,
	warnings: string[],
): DetectedNavigation | null {
	const callee = node.callee

	// router.push() or router.replace() - Next.js
	if (
		framework === "nextjs" &&
		callee?.type === "MemberExpression" &&
		callee.object?.type === "Identifier" &&
		callee.object.name === "router" &&
		callee.property?.type === "Identifier" &&
		(callee.property.name === "push" || callee.property.name === "replace")
	) {
		return extractPathFromCallArgs(node, "router-push", warnings)
	}

	// router.push() or router.replace() - Vue Router
	if (
		framework === "vue-router" &&
		callee?.type === "MemberExpression" &&
		callee.object?.type === "Identifier" &&
		callee.object.name === "router" &&
		callee.property?.type === "Identifier" &&
		(callee.property.name === "push" || callee.property.name === "replace")
	) {
		return extractPathFromCallArgs(node, "router-push", warnings)
	}

	// navigate() - React Router
	if (
		framework === "react-router" &&
		callee?.type === "Identifier" &&
		callee.name === "navigate"
	) {
		return extractPathFromCallArgs(node, "navigate", warnings)
	}

	// redirect() - Next.js
	if (
		framework === "nextjs" &&
		callee?.type === "Identifier" &&
		callee.name === "redirect"
	) {
		return extractPathFromCallArgs(node, "redirect", warnings)
	}

	return null
}

/**
 * Extract path from function call arguments
 */
function extractPathFromCallArgs(
	// biome-ignore lint/suspicious/noExplicitAny: Babel AST nodes have complex union types that are impractical to fully type
	node: any,
	type: DetectedNavigation["type"],
	warnings: string[],
): DetectedNavigation | null {
	const firstArg = node.arguments?.[0]

	if (!firstArg) {
		return null
	}

	// String literal
	if (firstArg.type === "StringLiteral") {
		const path = firstArg.value
		if (isValidInternalPath(path)) {
			return createDetectedNavigation(path, type, node.loc?.start.line ?? 0)
		}
	}

	// Template literal with no expressions
	if (
		firstArg.type === "TemplateLiteral" &&
		firstArg.expressions.length === 0 &&
		firstArg.quasis.length === 1
	) {
		const path = firstArg.quasis[0].value.cooked
		if (path && isValidInternalPath(path)) {
			return createDetectedNavigation(path, type, node.loc?.start.line ?? 0)
		}
	}

	// Object argument with path property (Vue Router style): { path: "/users" }
	if (firstArg.type === "ObjectExpression") {
		for (const prop of firstArg.properties || []) {
			if (
				prop.type === "ObjectProperty" &&
				prop.key?.type === "Identifier" &&
				prop.key.name === "path"
			) {
				// String literal value
				if (prop.value?.type === "StringLiteral") {
					const path = prop.value.value
					if (isValidInternalPath(path)) {
						return createDetectedNavigation(
							path,
							type,
							node.loc?.start.line ?? 0,
						)
					}
				}
				// Static template literal value
				if (
					prop.value?.type === "TemplateLiteral" &&
					prop.value.expressions.length === 0 &&
					prop.value.quasis.length === 1
				) {
					const path = prop.value.quasis[0].value.cooked
					if (path && isValidInternalPath(path)) {
						return createDetectedNavigation(
							path,
							type,
							node.loc?.start.line ?? 0,
						)
					}
				}
			}
		}
		// Object without static path (named route or dynamic path)
		const line = node.loc?.start.line ?? 0
		warnings.push(
			`Object-based navigation at line ${line} cannot be statically analyzed. Add the target screen ID manually to the 'next' field in screen.meta.ts.`,
		)
		return null
	}

	// Dynamic argument - add warning with actionable guidance
	const line = node.loc?.start.line ?? 0
	warnings.push(
		`Dynamic navigation path at line ${line} cannot be statically analyzed. Add the target screen ID manually to the 'next' field in screen.meta.ts.`,
	)

	return null
}

/**
 * Check if a path is a valid internal path (not external URL or hash link)
 */
function isValidInternalPath(path: string): boolean {
	// Skip external URLs
	if (
		path.startsWith("http://") ||
		path.startsWith("https://") ||
		path.startsWith("//")
	) {
		return false
	}
	// Skip hash-only links
	if (path.startsWith("#")) {
		return false
	}
	// Skip mailto and tel links
	if (path.startsWith("mailto:") || path.startsWith("tel:")) {
		return false
	}
	// Must start with /
	return path.startsWith("/")
}

/**
 * Walk AST node recursively
 */
function walkNode(
	// biome-ignore lint/suspicious/noExplicitAny: Babel AST nodes have complex union types that are impractical to fully type
	node: any,
	// biome-ignore lint/suspicious/noExplicitAny: Babel AST nodes have complex union types that are impractical to fully type
	callback: (node: any) => void,
): void {
	if (!node || typeof node !== "object") return

	callback(node)

	for (const key of Object.keys(node)) {
		const child = node[key]
		if (Array.isArray(child)) {
			for (const item of child) {
				walkNode(item, callback)
			}
		} else if (child && typeof child === "object" && child.type) {
			walkNode(child, callback)
		}
	}
}

/**
 * Merge detected navigation targets with existing `next` array.
 * Removes duplicates and preserves manual entries.
 *
 * @param existing - Existing next array (may include manual entries)
 * @param detected - Newly detected navigation targets
 * @returns Merged array without duplicates
 */
export function mergeNext(
	existing: string[],
	detected: DetectedNavigation[],
): string[] {
	const merged = new Set(existing)

	for (const nav of detected) {
		merged.add(nav.screenId)
	}

	return Array.from(merged).sort()
}

/**
 * Detect navigation framework from file content.
 * Returns both the framework and whether it was explicitly detected.
 */
export function detectNavigationFramework(
	content: string,
): FrameworkDetectionResult {
	// Check for Next.js patterns
	if (
		content.includes("next/link") ||
		content.includes("next/navigation") ||
		content.includes("next/router")
	) {
		return { framework: "nextjs", detected: true }
	}

	// Check for Vue Router patterns
	if (content.includes("vue-router")) {
		return { framework: "vue-router", detected: true }
	}

	// Check for React Router patterns
	if (
		content.includes("react-router") ||
		content.includes("@remix-run/react")
	) {
		return { framework: "react-router", detected: true }
	}

	// Check for useNavigate (React Router)
	if (content.includes("useNavigate")) {
		return { framework: "react-router", detected: true }
	}

	// Default to Next.js (more common in file-based routing projects)
	return { framework: "nextjs", detected: false }
}
