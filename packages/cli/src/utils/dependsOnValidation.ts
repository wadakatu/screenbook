import type { Screen } from "@screenbook/core"
import type { ParsedOpenApiSpec } from "./openApiParser.js"
import { findBestMatch } from "./suggestions.js"

/**
 * Validation error for an invalid dependsOn reference
 */
export interface DependsOnValidationError {
	/** ID of the screen with the invalid reference */
	screenId: string
	/** The invalid API reference */
	invalidApi: string
	/** Suggested correction (if found via fuzzy matching) */
	suggestion?: string
}

/**
 * Result of validating dependsOn references
 */
export interface DependsOnValidationResult {
	/** Whether all references are valid */
	valid: boolean
	/** List of validation errors */
	errors: DependsOnValidationError[]
}

/**
 * Normalize a dependsOn value for matching
 * - HTTP format: lowercase the method, keep path as-is
 * - operationId: return as-is (case-sensitive)
 */
function normalizeForMatching(value: string): {
	normalized: string
	isHttpFormat: boolean
} {
	// Check if it looks like HTTP format: "GET /path" or "POST /path"
	const httpMatch = value.match(/^(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s+/i)
	if (httpMatch) {
		// Normalize: lowercase method, keep path
		const method = httpMatch[1]!.toLowerCase()
		const path = value.slice(httpMatch[0].length)
		return {
			normalized: `${method} ${path}`,
			isHttpFormat: true,
		}
	}

	// Treat as operationId - return as-is for case-sensitive matching
	return {
		normalized: value,
		isHttpFormat: false,
	}
}

/**
 * Check if a dependsOn value matches any API in the parsed specs
 */
function matchesOpenApiSpec(
	dependsOnValue: string,
	specs: ParsedOpenApiSpec[],
): boolean {
	const { normalized, isHttpFormat } = normalizeForMatching(dependsOnValue)

	for (const spec of specs) {
		if (isHttpFormat) {
			// For HTTP format, check httpEndpoints (case-insensitive method via normalized)
			// We store normalized keys in normalizedToOriginal map
			if (spec.normalizedToOriginal.has(normalized)) {
				return true
			}
		} else {
			// For operationId, exact match first
			if (spec.operationIds.has(dependsOnValue)) {
				return true
			}
			// Then case-insensitive match
			if (spec.normalizedToOriginal.has(normalized.toLowerCase())) {
				return true
			}
		}
	}

	return false
}

/**
 * Get all valid API identifiers for fuzzy matching
 */
function getAllIdentifiers(specs: ParsedOpenApiSpec[]): string[] {
	const identifiers: string[] = []

	for (const spec of specs) {
		identifiers.push(...spec.operationIds)
		identifiers.push(...spec.httpEndpoints)
	}

	return identifiers
}

/**
 * Find a suggestion for an invalid API reference using fuzzy matching
 */
function findApiSuggestion(
	invalidApi: string,
	specs: ParsedOpenApiSpec[],
): string | undefined {
	const allIdentifiers = getAllIdentifiers(specs)
	if (allIdentifiers.length === 0) {
		return undefined
	}

	// Use higher tolerance for API names since they can vary significantly
	return findBestMatch(invalidApi, allIdentifiers, 0.5)
}

/**
 * Validate dependsOn references against OpenAPI specifications
 *
 * @param screens - Array of screen definitions to validate
 * @param specs - Parsed OpenAPI specifications to validate against
 * @returns Validation result with any errors found
 *
 * @example
 * ```ts
 * const screens = [
 *   { id: "invoice.detail", dependsOn: ["getInvoiceById", "unknownApi"] },
 * ]
 * const specs = await parseOpenApiSpecs(["./openapi.yaml"], cwd)
 *
 * const result = validateDependsOnReferences(screens, specs.specs)
 * if (!result.valid) {
 *   for (const error of result.errors) {
 *     console.log(`${error.screenId}: ${error.invalidApi}`)
 *     if (error.suggestion) {
 *       console.log(`  Did you mean "${error.suggestion}"?`)
 *     }
 *   }
 * }
 * ```
 */
export function validateDependsOnReferences(
	screens: Screen[],
	specs: ParsedOpenApiSpec[],
): DependsOnValidationResult {
	const errors: DependsOnValidationError[] = []

	for (const screen of screens) {
		if (!screen.dependsOn || screen.dependsOn.length === 0) {
			continue
		}

		for (const dep of screen.dependsOn) {
			if (!matchesOpenApiSpec(dep, specs)) {
				const suggestion = findApiSuggestion(dep, specs)
				errors.push({
					screenId: screen.id,
					invalidApi: dep,
					suggestion,
				})
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	}
}
