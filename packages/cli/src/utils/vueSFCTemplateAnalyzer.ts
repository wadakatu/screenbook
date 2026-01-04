import type { ElementNode, TemplateChildNode } from "@vue/compiler-core"
import { NodeTypes } from "@vue/compiler-core"
import { parse } from "@vue/compiler-sfc"
import {
	analyzeNavigation,
	createDetectedNavigation,
	type DetectedNavigation,
	isValidInternalPath,
} from "./navigationAnalyzer.js"

/**
 * Result of analyzing a Vue SFC for navigation
 */
export interface VueSFCAnalysisResult {
	/** Navigation targets detected in template */
	readonly templateNavigations: readonly DetectedNavigation[]
	/** Navigation targets detected in script */
	readonly scriptNavigations: readonly DetectedNavigation[]
	/** Any warnings during analysis */
	readonly warnings: readonly string[]
}

/**
 * Analyze a Vue Single File Component for navigation patterns.
 *
 * Detects:
 * - Template: `<RouterLink to="/path">`, `<router-link to="/path">`
 * - Template: `:to="'/path'"` (static string binding)
 * - Script: `router.push("/path")`, `router.replace("/path")`
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
		// Parse the SFC
		const { descriptor, errors } = parse(content, {
			filename: filePath,
			sourceMap: false,
		})

		// Report parse errors
		for (const error of errors) {
			warnings.push(`SFC parse error: ${error.message}`)
		}

		// Analyze template section
		if (descriptor.template?.ast) {
			const templateResult = analyzeTemplateAST(
				descriptor.template.ast.children,
				warnings,
			)
			templateNavigations.push(...templateResult)
		}

		// Analyze script section using existing analyzer
		const scriptContent =
			descriptor.scriptSetup?.content || descriptor.script?.content
		if (scriptContent) {
			const scriptResult = analyzeNavigation(scriptContent, "vue-router")
			scriptNavigations.push(...scriptResult.navigations)
			warnings.push(...scriptResult.warnings)
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		warnings.push(`Failed to analyze Vue SFC: ${message}`)
	}

	// Deduplicate by screenId
	const seenTemplateIds = new Set<string>()
	const uniqueTemplateNavigations = templateNavigations.filter((nav) => {
		if (seenTemplateIds.has(nav.screenId)) {
			return false
		}
		seenTemplateIds.add(nav.screenId)
		return true
	})

	const seenScriptIds = new Set<string>()
	const uniqueScriptNavigations = scriptNavigations.filter((nav) => {
		if (seenScriptIds.has(nav.screenId)) {
			return false
		}
		seenScriptIds.add(nav.screenId)
		return true
	})

	return {
		templateNavigations: uniqueTemplateNavigations,
		scriptNavigations: uniqueScriptNavigations,
		warnings,
	}
}

/**
 * Analyze template AST for RouterLink components
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
 * Extract navigation from RouterLink component
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
 * Extract path from dynamic :to binding
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
	}

	return null
}

/**
 * Check if a string is a static string literal
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
 * Walk template AST nodes recursively
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
