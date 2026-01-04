import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { Parser } from "htmlparser2"
import {
	analyzeNavigation,
	type ComponentAnalysisResult,
	createDetectedNavigation,
	type DetectedNavigation,
	deduplicateByScreenId,
	isValidInternalPath,
} from "./navigationAnalyzer.js"

/**
 * Result of analyzing an Angular component for navigation.
 * Type alias for the shared ComponentAnalysisResult.
 */
export type AngularComponentAnalysisResult = ComponentAnalysisResult

/**
 * Analyze an Angular component for navigation patterns.
 *
 * Detects:
 * - Template: `<a routerLink="/path">`, `<a [routerLink]="'/path'">`, `<a [routerLink]="['/path']">`
 * - Script: `router.navigate(['/path'])`, `router.navigateByUrl('/path')`
 *
 * Results are deduplicated by screenId, keeping the first occurrence.
 *
 * @param content - The Angular component content to analyze
 * @param filePath - The file path (used for error messages and resolving templateUrl)
 * @param _cwd - The current working directory (unused, kept for API consistency with other analyzers)
 * @returns Analysis result with detected navigations and warnings
 *
 * @throws Never - All errors are caught and converted to warnings
 */
export function analyzeAngularComponent(
	content: string,
	filePath: string,
	_cwd: string,
): AngularComponentAnalysisResult {
	const templateNavigations: DetectedNavigation[] = []
	const scriptNavigations: DetectedNavigation[] = []
	const warnings: string[] = []

	try {
		// Extract template content from @Component decorator
		const templateResult = extractTemplateContent(content, filePath)

		if (templateResult.warning) {
			warnings.push(templateResult.warning)
		}

		if (templateResult.content) {
			const templateNavs = analyzeTemplateHTML(templateResult.content, warnings)
			templateNavigations.push(...templateNavs)
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
 * Result of template extraction.
 */
interface TemplateExtractionResult {
	/** The extracted template content, or null if not found */
	content: string | null
	/** Warning message if extraction failed */
	warning: string | null
}

/**
 * Extract template content from @Component decorator.
 *
 * Handles both inline `template` and external `templateUrl` properties.
 * Uses regex-based extraction for reliability with Angular's decorator syntax.
 *
 * Limitations:
 * - Does not handle templates containing unescaped backticks
 * - Does not handle escaped quotes within template strings
 * - Returns warning if templateUrl file cannot be read
 *
 * @param content - The component TypeScript content
 * @param filePath - The file path for resolving relative templateUrl
 * @returns Extraction result with content and optional warning
 */
function extractTemplateContent(
	content: string,
	filePath: string,
): TemplateExtractionResult {
	// Try to extract inline template using regex
	// Pattern 1: template: `...` (template literal)
	// Note: This simple pattern does not handle templates containing backticks
	const backtickPattern = /template\s*:\s*`([^`]*)`/
	const templateLiteralMatch = content.match(backtickPattern)
	if (templateLiteralMatch?.[1] !== undefined) {
		return { content: templateLiteralMatch[1], warning: null }
	}

	// Pattern 2: template: '...' (single-quoted string)
	const singleQuoteMatch = content.match(/template\s*:\s*'([^']*)'/)
	if (singleQuoteMatch?.[1] !== undefined) {
		return { content: singleQuoteMatch[1], warning: null }
	}

	// Pattern 3: template: "..." (double-quoted string)
	const doubleQuoteMatch = content.match(/template\s*:\s*"([^"]*)"/)
	if (doubleQuoteMatch?.[1] !== undefined) {
		return { content: doubleQuoteMatch[1], warning: null }
	}

	// Pattern 4: templateUrl: '...' or templateUrl: "..." (external file)
	const templateUrlMatch = content.match(/templateUrl\s*:\s*['"]([^'"]+)['"]/)
	if (templateUrlMatch?.[1]) {
		const templatePath = resolve(dirname(filePath), templateUrlMatch[1])
		try {
			return { content: readFileSync(templatePath, "utf-8"), warning: null }
		} catch (error) {
			const errorCode = (error as NodeJS.ErrnoException).code
			let warning: string

			if (errorCode === "ENOENT") {
				warning =
					`Template file not found: ${templatePath}. ` +
					"Navigation in this template will not be detected. " +
					"Add navigation targets manually to the 'next' field in screen.meta.ts."
			} else if (errorCode === "EACCES") {
				warning =
					`Permission denied reading template: ${templatePath}. ` +
					"Check file permissions to enable template analysis."
			} else {
				const msg = error instanceof Error ? error.message : String(error)
				warning = `Failed to read template file ${templatePath}: ${msg}`
			}

			return { content: null, warning }
		}
	}

	return { content: null, warning: null }
}

/**
 * Analyze HTML template for routerLink directives.
 *
 * Note: Line numbers are approximate as htmlparser2 only tracks newlines in text nodes,
 * not in tags or attributes. Line numbers may drift from actual positions.
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
	const parserErrors: string[] = []

	const parser = new Parser({
		onopentag(_name, attribs) {
			// Note: htmlparser2 lowercases attribute names
			// Check for static routerLink (becomes routerlink)
			if ("routerlink" in attribs) {
				const value = attribs.routerlink
				if (value) {
					if (isValidInternalPath(value)) {
						navigations.push(
							createDetectedNavigation(value, "link", currentLine),
						)
					} else if (!value.startsWith("/") && !value.includes("://")) {
						// Looks like a relative path - warn user
						warnings.push(
							`routerLink at line ~${currentLine} has relative path "${value}". ` +
								"Angular routerLink paths should start with '/' for absolute routing. " +
								"Navigation will not be detected for this link.",
						)
					}
					// External URLs are intentionally skipped without warning
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
			// Track approximate line numbers by counting newlines in text nodes.
			// Note: Line numbers may be approximate as newlines in tags/attributes are not counted.
			currentLine += (text.match(/\n/g) || []).length
		},
		onerror(error) {
			parserErrors.push(
				`HTML parsing error at line ~${currentLine}: ${error.message}. ` +
					"Some navigation targets may not be detected.",
			)
		},
	})

	parser.write(html)
	parser.end()

	// Add any parser errors to warnings
	warnings.push(...parserErrors)

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
 * Note: Does not handle escaped quotes (e.g., \' or \"). This is acceptable
 * because Angular routerLink paths should not contain quotes.
 *
 * @param expression - The binding expression value
 * @param line - Line number for warning messages (approximate)
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
			`Empty [routerLink] binding at line ~${line}. Add the target screen ID manually to the 'next' field in screen.meta.ts.`,
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
		if (!path.startsWith("/") && !path.includes("://")) {
			warnings.push(
				`[routerLink] at line ~${line} has relative path "${path}". ` +
					"Angular routerLink paths should start with '/' for absolute routing. " +
					"Navigation will not be detected for this link.",
			)
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
			if (!path.startsWith("/") && !path.includes("://")) {
				warnings.push(
					`[routerLink] at line ~${line} has relative path "${path}". ` +
						"Angular routerLink paths should start with '/' for absolute routing. " +
						"Navigation will not be detected for this link.",
				)
			}
		}
		return null
	}

	// Dynamic expression - cannot be statically analyzed
	warnings.push(
		`Dynamic [routerLink] binding at line ~${line} cannot be statically analyzed. Add the target screen ID manually to the 'next' field in screen.meta.ts.`,
	)
	return null
}

/**
 * Find the index of the first comma outside of quotes.
 *
 * Note: Does not handle escaped quotes (e.g., \' or \"). This is acceptable
 * because Angular routerLink paths should not contain quotes.
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
