import type { ElementNode, TemplateChildNode } from "@vue/compiler-core"
import { NodeTypes } from "@vue/compiler-core"
import { parse } from "@vue/compiler-sfc"
import {
	analyzeNavigation,
	type ComponentAnalysisResult,
	createDetectedNavigation,
	type DetectedNavigation,
	deduplicateByScreenId,
	isValidInternalPath,
} from "./navigationAnalyzer.js"

/**
 * Result of analyzing a Vue SFC for navigation.
 * Type alias for the shared ComponentAnalysisResult.
 */
export type VueSFCAnalysisResult = ComponentAnalysisResult

/**
 * Analyze a Vue Single File Component for navigation patterns.
 *
 * Detects:
 * - Template: `<RouterLink to="/path">`, `<router-link to="/path">`
 * - Template: `:to="'/path'"` (static string binding)
 * - Script: `router.push("/path")`, `router.replace("/path")`
 * - Script: `router.push({ path: "/path" })` (object-based navigation)
 *
 * @param content - The Vue SFC content to analyze
 * @param filePath - The file path (used for error messages)
 * @returns Analysis result with detected navigations and warnings
 */
export function analyzeVueSFC(
	content: string,
	filePath: string,
): VueSFCAnalysisResult {
	const templateNavigations: DetectedNavigation[] = []
	const scriptNavigations: DetectedNavigation[] = []
	const warnings: string[] = []

	try {
		const { descriptor, errors } = parse(content, {
			filename: filePath,
			sourceMap: false,
		})

		for (const error of errors) {
			warnings.push(`SFC parse error: ${error.message}`)
		}

		if (descriptor.template?.ast) {
			const templateResult = analyzeTemplateAST(
				descriptor.template.ast.children,
				warnings,
			)
			templateNavigations.push(...templateResult)
		}

		const scriptContent =
			descriptor.scriptSetup?.content || descriptor.script?.content
		if (scriptContent) {
			const scriptResult = analyzeNavigation(scriptContent, "vue-router")
			scriptNavigations.push(...scriptResult.navigations)
			warnings.push(...scriptResult.warnings)
		}
	} catch (error) {
		if (error instanceof SyntaxError) {
			warnings.push(`SFC syntax error in ${filePath}: ${error.message}`)
		} else if (error instanceof RangeError) {
			warnings.push(
				`${filePath}: File too complex for navigation analysis. Consider simplifying the template structure.`,
			)
		} else {
			const message = error instanceof Error ? error.message : String(error)
			warnings.push(
				`${filePath}: Unexpected error during analysis: ${message}. Please report this as a bug.`,
			)
		}
	}

	return {
		templateNavigations: deduplicateByScreenId(templateNavigations),
		scriptNavigations: deduplicateByScreenId(scriptNavigations),
		warnings,
	}
}

/**
 * Analyze template AST for RouterLink components.
 *
 * @param nodes - Array of template child nodes to traverse
 * @param warnings - Array to collect warnings during analysis (mutated)
 * @returns Array of detected navigation targets from RouterLink components
 */
function analyzeTemplateAST(
	nodes: TemplateChildNode[],
	warnings: string[],
): DetectedNavigation[] {
	const navigations: DetectedNavigation[] = []

	walkTemplateNodes(nodes, (node) => {
		if (node.type === NodeTypes.ELEMENT) {
			const elementNode = node as ElementNode
			if (isRouterLinkComponent(elementNode.tag)) {
				const nav = extractRouterLinkNavigation(elementNode, warnings)
				if (nav) {
					navigations.push(nav)
				}
			}
		}
	})

	return navigations
}

/**
 * Check if a tag is a RouterLink component
 */
function isRouterLinkComponent(tag: string): boolean {
	return tag === "RouterLink" || tag === "router-link"
}

/**
 * Extract navigation from RouterLink component.
 *
 * @param node - The element node representing a RouterLink component
 * @param warnings - Array to collect warnings (mutated)
 * @returns Detected navigation or null if no valid path found
 */
function extractRouterLinkNavigation(
	node: ElementNode,
	warnings: string[],
): DetectedNavigation | null {
	for (const prop of node.props) {
		// Static attribute: to="/path"
		if (prop.type === NodeTypes.ATTRIBUTE && prop.name === "to") {
			if (prop.value) {
				const path = prop.value.content
				if (isValidInternalPath(path)) {
					return createDetectedNavigation(path, "link", prop.loc.start.line)
				}
			}
		}

		// Dynamic binding: :to="'/path'" or v-bind:to="'/path'"
		if (prop.type === NodeTypes.DIRECTIVE && prop.name === "bind") {
			// Check if this is binding the "to" prop
			if (
				prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION &&
				prop.arg.content === "to"
			) {
				return extractDynamicToBinding(prop, node.loc.start.line, warnings)
			}
		}
	}

	return null
}

/**
 * Extract path from dynamic :to binding.
 *
 * Handles expressions like `:to="'/path'"` or `v-bind:to="'/path'"`.
 * Complex expressions that cannot be statically analyzed generate warnings.
 *
 * @param directive - The Vue directive AST node
 * @param line - Line number for warning messages
 * @param warnings - Array to collect warnings (mutated)
 * @returns Detected navigation or null if path cannot be extracted
 */
function extractDynamicToBinding(
	// biome-ignore lint/suspicious/noExplicitAny: Vue compiler types are complex
	directive: any,
	line: number,
	warnings: string[],
): DetectedNavigation | null {
	const exp = directive.exp

	if (!exp) {
		warnings.push(
			`Empty :to binding at line ${line}. Add the target screen ID manually to the 'next' field in screen.meta.ts.`,
		)
		return null
	}

	if (exp.type === NodeTypes.SIMPLE_EXPRESSION) {
		const content = exp.content.trim()

		// Check if it's a static string literal
		if (isStaticStringLiteral(content)) {
			const path = extractStringValue(content)
			if (path && isValidInternalPath(path)) {
				return createDetectedNavigation(path, "link", line)
			}
		}

		// Dynamic variable or complex expression
		warnings.push(
			`Dynamic :to binding at line ${line} cannot be statically analyzed. Add the target screen ID manually to the 'next' field in screen.meta.ts.`,
		)
	} else {
		// Complex expression type (COMPOUND_EXPRESSION, etc.)
		warnings.push(
			`Complex :to binding at line ${line} uses an unsupported expression type. Add the target screen ID manually to the 'next' field in screen.meta.ts.`,
		)
	}

	return null
}

/**
 * Check if expression content is a static string literal.
 *
 * Recognizes single quotes, double quotes, and template literals without interpolation.
 *
 * @param content - The expression content (e.g., "'/path'" or "`/home`")
 * @returns true if the content is a statically analyzable string literal
 */
function isStaticStringLiteral(content: string): boolean {
	// Single quotes: '/path'
	if (content.startsWith("'") && content.endsWith("'")) {
		return true
	}
	// Double quotes: "/path"
	if (content.startsWith('"') && content.endsWith('"')) {
		return true
	}
	// Template literal without interpolation: `/path`
	if (
		content.startsWith("`") &&
		content.endsWith("`") &&
		!content.includes("${")
	) {
		return true
	}
	return false
}

/**
 * Extract string value from a quoted string
 */
function extractStringValue(content: string): string {
	return content.slice(1, -1)
}

/**
 * Walk template AST nodes recursively in pre-order traversal.
 *
 * Traverses element nodes, v-if branches, and v-for loop bodies.
 *
 * @param nodes - Array of template child nodes to traverse
 * @param callback - Function called for each node visited
 */
function walkTemplateNodes(
	nodes: TemplateChildNode[],
	callback: (node: TemplateChildNode) => void,
): void {
	for (const node of nodes) {
		callback(node)

		// Element nodes have children
		if (node.type === NodeTypes.ELEMENT) {
			const elementNode = node as ElementNode
			if (elementNode.children) {
				walkTemplateNodes(elementNode.children, callback)
			}
		}

		// IF nodes have branches with children
		if (node.type === NodeTypes.IF) {
			// biome-ignore lint/suspicious/noExplicitAny: Vue compiler types are complex
			const ifNode = node as any
			for (const branch of ifNode.branches || []) {
				if (branch.children) {
					walkTemplateNodes(branch.children, callback)
				}
			}
		}

		// FOR nodes have children
		if (node.type === NodeTypes.FOR) {
			// biome-ignore lint/suspicious/noExplicitAny: Vue compiler types are complex
			const forNode = node as any
			if (forNode.children) {
				walkTemplateNodes(forNode.children, callback)
			}
		}
	}
}
