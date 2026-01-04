import { parse } from "@babel/parser"
import type { ApiIntegrationConfig } from "@screenbook/core"

/**
 * Detected API import from a source file
 */
export interface DetectedApiImport {
	/** The imported name (function, hook, or type) */
	importName: string
	/** The source package */
	packageName: string
	/** Transformed name for dependsOn field (packageName/importName or custom) */
	dependsOnName: string
	/** Line number of the import */
	line: number
}

/**
 * Result of analyzing a file for API imports
 */
export interface ApiAnalysisResult {
	/** Detected API imports */
	imports: DetectedApiImport[]
	/** Any warnings during analysis */
	warnings: string[]
}

/**
 * Analyze a file's content for API client imports.
 *
 * Supports:
 * - Named imports: `import { getUsers, createUser } from "@api/client"`
 * - Default imports: `import api from "@api/client"` (with warning)
 * - Namespace imports: `import * as api from "@api/client"` (with warning)
 *
 * @param content - The file content to analyze
 * @param config - API integration configuration
 * @returns Analysis result with detected imports and warnings
 */
export function analyzeApiImports(
	content: string,
	config: ApiIntegrationConfig,
): ApiAnalysisResult {
	const imports: DetectedApiImport[] = []
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
			warnings.push(`Syntax error during import analysis: ${error.message}`)
			return { imports, warnings }
		}
		const message = error instanceof Error ? error.message : String(error)
		warnings.push(`Failed to parse file for import analysis: ${message}`)
		return { imports, warnings }
	}

	// Normalize client packages for matching
	const clientPackages = new Set(config.clientPackages)

	// Find import declarations
	for (const node of ast.program.body) {
		if (node.type !== "ImportDeclaration") {
			continue
		}

		const source = node.source.value
		const line = node.loc?.start.line ?? 0

		// Check if this import is from a configured client package
		if (!isMatchingPackage(source, clientPackages)) {
			continue
		}

		// Skip type-only imports
		if (node.importKind === "type") {
			continue
		}

		for (const specifier of node.specifiers) {
			// Skip type-only specifiers within a regular import
			if (
				specifier.type === "ImportSpecifier" &&
				specifier.importKind === "type"
			) {
				continue
			}

			if (specifier.type === "ImportSpecifier") {
				// Named import: import { getUsers } from "@api/client"
				const importedName =
					specifier.imported.type === "Identifier"
						? specifier.imported.name
						: specifier.imported.value

				const transformedName = config.extractApiName
					? config.extractApiName(importedName)
					: importedName

				imports.push({
					importName: importedName,
					packageName: source,
					dependsOnName: `${source}/${transformedName}`,
					line,
				})
			} else if (specifier.type === "ImportDefaultSpecifier") {
				// Default import: import api from "@api/client"
				warnings.push(
					`Default import from "${source}" at line ${line} cannot be statically analyzed. Consider using named imports.`,
				)
			} else if (specifier.type === "ImportNamespaceSpecifier") {
				// Namespace import: import * as api from "@api/client"
				warnings.push(
					`Namespace import from "${source}" at line ${line} cannot be statically analyzed. Consider using named imports.`,
				)
			}
		}
	}

	return { imports, warnings }
}

/**
 * Check if a source path matches any of the configured client packages.
 * Supports exact match and path prefix matching.
 */
function isMatchingPackage(
	source: string,
	clientPackages: Set<string>,
): boolean {
	// Exact match
	if (clientPackages.has(source)) {
		return true
	}

	// Check if source starts with any client package (for subpath imports)
	// e.g., "@api/client" should match "@api/client/users"
	for (const pkg of clientPackages) {
		if (source.startsWith(`${pkg}/`)) {
			return true
		}
	}

	return false
}

/**
 * Merge detected API dependencies with existing ones.
 * Removes duplicates and preserves manual entries.
 *
 * @param existing - Existing dependsOn array (may include manual entries)
 * @param detected - Newly detected API dependencies
 * @returns Merged array without duplicates
 */
export function mergeDependsOn(
	existing: string[],
	detected: DetectedApiImport[],
): string[] {
	const merged = new Set(existing)

	for (const dep of detected) {
		merged.add(dep.dependsOnName)
	}

	return Array.from(merged).sort()
}
