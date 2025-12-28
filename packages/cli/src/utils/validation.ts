import type { Screen } from "@screenbook/core"

export interface ValidationError {
	screenId: string
	field: "next" | "entryPoints"
	invalidRef: string
	suggestion?: string
}

export interface ValidationResult {
	valid: boolean
	errors: ValidationError[]
}

/**
 * Validate screen references (next and entryPoints)
 */
export function validateScreenReferences(screens: Screen[]): ValidationResult {
	const screenIds = new Set(screens.map((s) => s.id))
	const errors: ValidationError[] = []

	for (const screen of screens) {
		// Validate next references
		if (screen.next) {
			for (const nextId of screen.next) {
				if (!screenIds.has(nextId)) {
					errors.push({
						screenId: screen.id,
						field: "next",
						invalidRef: nextId,
						suggestion: findSimilar(nextId, screenIds),
					})
				}
			}
		}

		// Validate entryPoints references
		if (screen.entryPoints) {
			for (const entryId of screen.entryPoints) {
				if (!screenIds.has(entryId)) {
					errors.push({
						screenId: screen.id,
						field: "entryPoints",
						invalidRef: entryId,
						suggestion: findSimilar(entryId, screenIds),
					})
				}
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	}
}

/**
 * Find similar screen ID using Levenshtein distance
 */
function findSimilar(
	target: string,
	candidates: Set<string>,
): string | undefined {
	let bestMatch: string | undefined
	let bestDistance = Number.POSITIVE_INFINITY

	// Only suggest if distance is reasonable (less than 40% of target length)
	const maxDistance = Math.ceil(target.length * 0.4)

	for (const candidate of candidates) {
		const distance = levenshteinDistance(target, candidate)
		if (distance < bestDistance && distance <= maxDistance) {
			bestDistance = distance
			bestMatch = candidate
		}
	}

	return bestMatch
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
	// Pre-initialize matrix with proper dimensions
	const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
		Array.from({ length: b.length + 1 }, () => 0),
	)

	// Helper to safely get/set matrix values (matrix is pre-initialized, so these are always valid)
	const get = (i: number, j: number): number => matrix[i]?.[j] ?? 0
	const set = (i: number, j: number, value: number): void => {
		const row = matrix[i]
		if (row) row[j] = value
	}

	// Initialize first column
	for (let i = 0; i <= a.length; i++) {
		set(i, 0, i)
	}

	// Initialize first row
	for (let j = 0; j <= b.length; j++) {
		set(0, j, j)
	}

	// Fill the matrix
	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1
			set(
				i,
				j,
				Math.min(
					get(i - 1, j) + 1, // deletion
					get(i, j - 1) + 1, // insertion
					get(i - 1, j - 1) + cost, // substitution
				),
			)
		}
	}

	return get(a.length, b.length)
}

/**
 * Format validation errors for console output
 */
export function formatValidationErrors(errors: ValidationError[]): string {
	const lines: string[] = []

	for (const error of errors) {
		lines.push(`  Screen "${error.screenId}"`)
		lines.push(
			`    → ${error.field} references non-existent screen "${error.invalidRef}"`,
		)
		if (error.suggestion) {
			lines.push(`    Did you mean "${error.suggestion}"?`)
		}
		lines.push("")
	}

	return lines.join("\n")
}
