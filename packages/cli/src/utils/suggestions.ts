/**
 * Fuzzy matching utilities for suggesting similar values
 */

export interface FindSimilarOptions {
	/** Maximum Levenshtein distance ratio (0-1). Default: 0.4 (40% of target length) */
	maxDistanceRatio?: number
	/** Maximum number of suggestions to return. Default: 3 */
	maxSuggestions?: number
}

/**
 * Find similar strings using Levenshtein distance
 */
export function findSimilar(
	target: string,
	candidates: string[] | Set<string>,
	options: FindSimilarOptions = {},
): string[] {
	const { maxDistanceRatio = 0.4, maxSuggestions = 3 } = options
	const candidateArray = Array.isArray(candidates)
		? candidates
		: Array.from(candidates)

	// Only suggest if distance is reasonable
	const maxDistance = Math.ceil(target.length * maxDistanceRatio)

	const matches: Array<{ candidate: string; distance: number }> = []

	for (const candidate of candidateArray) {
		const distance = levenshteinDistance(target, candidate)
		if (distance <= maxDistance) {
			matches.push({ candidate, distance })
		}
	}

	// Sort by distance (closest first) and return top suggestions
	return matches
		.sort((a, b) => a.distance - b.distance)
		.slice(0, maxSuggestions)
		.map((m) => m.candidate)
}

/**
 * Find the single best match (for backwards compatibility)
 */
export function findBestMatch(
	target: string,
	candidates: string[] | Set<string>,
	maxDistanceRatio = 0.4,
): string | undefined {
	const matches = findSimilar(target, candidates, {
		maxDistanceRatio,
		maxSuggestions: 1,
	})
	return matches[0]
}

/**
 * Format suggestions for display in error messages
 */
export function formatSuggestions(suggestions: string[]): string {
	if (suggestions.length === 0) {
		return ""
	}

	const lines = ["Did you mean one of these?"]
	for (const suggestion of suggestions) {
		lines.push(`  - ${suggestion}`)
	}
	return lines.join("\n")
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
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
