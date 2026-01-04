import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { Parser } from "htmlparser2"
import {
	analyzeNavigation,
	createDetectedNavigation,
	type DetectedNavigation,
	isValidInternalPath,
} from "./navigationAnalyzer.js"

/**
 * Result of analyzing an Angular component for navigation
 */
export interface AngularComponentAnalysisResult {
	/** Navigation targets detected in template */
	readonly templateNavigations: readonly DetectedNavigation[]
	/** Navigation targets detected in script */
	readonly scriptNavigations: readonly DetectedNavigation[]
	/** Any warnings during analysis */
	readonly warnings: readonly string[]
}

/**
 * Analyze an Angular component for navigation patterns.
 *
 * Detects:
 * - Template: `<a routerLink="/path">`, `<a [routerLink]="'/path'">`, `<a [routerLink]="['/path']">`
 * - Script: `router.navigate(['/path'])`, `router.navigateByUrl('/path')`
 *
 * @param content - The Angular component content to analyze
 * @param filePath - The file path (used for error messages and resolving templateUrl)
 * @param cwd - The current working directory for resolving relative paths
 * @returns Analysis result with detected navigations and warnings
 */
export function analyzeAngularComponent(
	content: string,
	filePath: string,
	cwd: string,
): AngularComponentAnalysisResult {
	const templateNavigations: DetectedNavigation[] = []
	const scriptNavigations: DetectedNavigation[] = []
	const warnings: string[] = []

	try {
		// Extract template content from @Component decorator
		const templateContent = extractTemplateContent(content, filePath, cwd)

		if (templateContent) {
			const templateResult = analyzeTemplateHTML(templateContent, warnings)
			templateNavigations.push(...templateResult)
		}

		// Analyze script with existing navigation analyzer
		const scriptResult = analyzeNavigation(content, "angular")
		scriptNavigations.push(...scriptResult.navigations)
		warnings.push(...scriptResult.warnings)
	} catch (error) {
		if (error instanceof SyntaxError) {
			warnings.push(`Syntax error in ${filePath}: ${error.message}`)
		} else if (error instanceof RangeError) {
			warnings.push(
				`${filePath}: File too complex for navigation analysis. Consider simplifying the component structure.`,
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
 * Deduplicate navigations by screenId.
 *
 * @param navigations - Array of detected navigations
 * @returns Array with duplicate screenIds removed (keeps first occurrence)
 */
function deduplicateByScreenId(
	navigations: DetectedNavigation[],
): DetectedNavigation[] {
	const seen = new Set<string>()
	return navigations.filter((nav) => {
		if (seen.has(nav.screenId)) {
			return false
		}
		seen.add(nav.screenId)
		return true
	})
}

/**
 * Extract template content from @Component decorator.
 *
 * Handles both inline `template` and external `templateUrl` properties.
 * Uses regex-based extraction for reliability with Angular's decorator syntax.
 *
 * @param content - The component TypeScript content
 * @param filePath - The file path for resolving relative templateUrl
 * @param _cwd - The current working directory (unused but kept for API consistency)
 * @returns The template HTML content, or null if not found
 */
function extractTemplateContent(
	content: string,
	filePath: string,
	_cwd: string,
): string | null {
	// Try to extract inline template using regex
	// Pattern 1: template: `...` (template literal)
	// We need to find matching backticks while handling nested backticks (rare in templates)
	const backtickPattern = /template\s*:\s*`([^`]*)`/
	const templateLiteralMatch = content.match(backtickPattern)
	if (templateLiteralMatch?.[1] !== undefined) {
		return templateLiteralMatch[1]
	}

	// Pattern 2: template: '...' (single-quoted string)
	const singleQuoteMatch = content.match(/template\s*:\s*'([^']*)'/)
	if (singleQuoteMatch?.[1] !== undefined) {
		return singleQuoteMatch[1]
	}

	// Pattern 3: template: "..." (double-quoted string)
	const doubleQuoteMatch = content.match(/template\s*:\s*"([^"]*)"/)
	if (doubleQuoteMatch?.[1] !== undefined) {
		return doubleQuoteMatch[1]
	}

	// Pattern 4: templateUrl: '...' or templateUrl: "..." (external file)
	const templateUrlMatch = content.match(/templateUrl\s*:\s*['"]([^'"]+)['"]/)
	if (templateUrlMatch?.[1]) {
		try {
			const templatePath = resolve(dirname(filePath), templateUrlMatch[1])
			return readFileSync(templatePath, "utf-8")
		} catch {
			// Template file not found, will be handled elsewhere
		}
	}

	return null
}

/**
 * Analyze HTML template for routerLink directives.
 *
 * @param html - The HTML template content
 * @param warnings - Array to collect warnings (mutated)
 * @returns Array of detected navigation targets
 */
function analyzeTemplateHTML(
	html: string,
	warnings: string[],
): DetectedNavigation[] {
	const navigations: DetectedNavigation[] = []
	let currentLine = 1

	const parser = new Parser({
		onopentag(_name, attribs) {
			// Note: htmlparser2 lowercases attribute names
			// Check for static routerLink (becomes routerlink)
			if ("routerlink" in attribs) {
				const value = attribs.routerlink
				if (value && isValidInternalPath(value)) {
					navigations.push(createDetectedNavigation(value, "link", currentLine))
				}
			}

			// Check for property binding [routerLink] (becomes [routerlink])
			if ("[routerlink]" in attribs) {
				const expression = attribs["[routerlink]"]
				const nav = extractRouterLinkPath(expression, currentLine, warnings)
				if (nav) {
					navigations.push(nav)
				}
			}
		},
		ontext(text) {
			// Track line numbers by counting newlines in text
			currentLine += (text.match(/\n/g) || []).length
		},
	})

	parser.write(html)
	parser.end()

	return navigations
}

/**
 * Extract path from [routerLink] binding expression.
 *
 * Handles:
 * - String literals: `[routerLink]="'/path'"` or `[routerLink]='"/path"'`
 * - Array literals: `[routerLink]="['/path']"` or `[routerLink]="['/path', param]"`
 * - Warns on dynamic expressions: `[routerLink]="dynamicPath"`
 *
 * @param expression - The binding expression value
 * @param line - Line number for warning messages
 * @param warnings - Array to collect warnings (mutated)
 * @returns Detected navigation or null if path cannot be extracted
 */
function extractRouterLinkPath(
	expression: string,
	line: number,
	warnings: string[],
): DetectedNavigation | null {
	if (!expression) {
		warnings.push(
			`Empty [routerLink] binding at line ${line}. Add the target screen ID manually to the 'next' field in screen.meta.ts.`,
		)
		return null
	}

	const trimmed = expression.trim()

	// Check for string literal: '/path' or "/path"
	if (
		(trimmed.startsWith("'") && trimmed.endsWith("'")) ||
		(trimmed.startsWith('"') && trimmed.endsWith('"'))
	) {
		const path = trimmed.slice(1, -1)
		if (isValidInternalPath(path)) {
			return createDetectedNavigation(path, "link", line)
		}
		return null
	}

	// Check for array literal: ['/path'] or ['/path', param]
	if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
		const arrayContent = trimmed.slice(1, -1).trim()

		// Find the first element (path) - handle comma separation
		const firstComma = findFirstCommaOutsideQuotes(arrayContent)
		const firstElement =
			firstComma >= 0
				? arrayContent.slice(0, firstComma).trim()
				: arrayContent.trim()

		// Check if first element is a string literal
		if (
			(firstElement.startsWith("'") && firstElement.endsWith("'")) ||
			(firstElement.startsWith('"') && firstElement.endsWith('"'))
		) {
			const path = firstElement.slice(1, -1)
			if (isValidInternalPath(path)) {
				return createDetectedNavigation(path, "link", line)
			}
		}
	}

	// Dynamic expression - cannot be statically analyzed
	warnings.push(
		`Dynamic [routerLink] binding at line ${line} cannot be statically analyzed. Add the target screen ID manually to the 'next' field in screen.meta.ts.`,
	)
	return null
}

/**
 * Find the index of the first comma outside of quotes.
 *
 * @param str - The string to search
 * @returns Index of first comma, or -1 if not found
 */
function findFirstCommaOutsideQuotes(str: string): number {
	let inSingleQuote = false
	let inDoubleQuote = false

	for (let i = 0; i < str.length; i++) {
		const char = str[i]

		if (char === "'" && !inDoubleQuote) {
			inSingleQuote = !inSingleQuote
		} else if (char === '"' && !inSingleQuote) {
			inDoubleQuote = !inDoubleQuote
		} else if (char === "," && !inSingleQuote && !inDoubleQuote) {
			return i
		}
	}

	return -1
}
