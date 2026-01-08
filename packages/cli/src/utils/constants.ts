/**
 * Default patterns to exclude from route file scanning.
 * These directories typically contain reusable components, not navigable screens.
 * @see https://github.com/wadakatu/screenbook/issues/170
 * @see https://github.com/wadakatu/screenbook/issues/190
 */
export const DEFAULT_EXCLUDE_PATTERNS = [
	"**/components/**",
	"**/shared/**",
	"**/utils/**",
	"**/hooks/**",
	"**/composables/**",
	"**/stores/**",
	"**/services/**",
	"**/helpers/**",
	"**/lib/**",
	"**/common/**",
] as const

export type DefaultExcludePattern = (typeof DEFAULT_EXCLUDE_PATTERNS)[number]

/**
 * Check if a path matches any of the exclude patterns.
 * Used by both generate and lint commands for consistent behavior.
 */
export function matchesExcludePattern(
	filePath: string,
	excludePatterns: readonly string[],
): boolean {
	// Simple pattern matching for directory-based patterns
	for (const pattern of excludePatterns) {
		// Convert glob pattern to a simple check
		// e.g., "**/components/**" -> path contains "/components/"
		const cleanPattern = pattern
			.replace(/\*\*/g, "")
			.replace(/\*/g, "")
			.replace(/^\//, "")
			.replace(/\/$/, "")

		if (cleanPattern && filePath.includes(`/${cleanPattern}/`)) {
			return true
		}
		// Also check if the path starts with the pattern (e.g., "components/...")
		if (cleanPattern && filePath.startsWith(`${cleanPattern}/`)) {
			return true
		}
	}
	return false
}
