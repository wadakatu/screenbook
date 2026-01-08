import { describe, expect, it } from "vitest"
import {
	DEFAULT_EXCLUDE_PATTERNS,
	matchesExcludePattern,
} from "../utils/constants.js"

describe("matchesExcludePattern", () => {
	it("should match paths containing /components/", () => {
		expect(
			matchesExcludePattern(
				"src/pages/Dashboard/components/Widget",
				DEFAULT_EXCLUDE_PATTERNS,
			),
		).toBe(true)
	})

	it("should match paths starting with components/", () => {
		expect(
			matchesExcludePattern("components/Button", DEFAULT_EXCLUDE_PATTERNS),
		).toBe(true)
	})

	it("should NOT match regular page paths", () => {
		expect(
			matchesExcludePattern("src/pages/Dashboard", DEFAULT_EXCLUDE_PATTERNS),
		).toBe(false)
	})

	it("should match all default exclude patterns", () => {
		expect(
			matchesExcludePattern("src/hooks/useAuth", DEFAULT_EXCLUDE_PATTERNS),
		).toBe(true)
		expect(
			matchesExcludePattern(
				"src/composables/useData",
				DEFAULT_EXCLUDE_PATTERNS,
			),
		).toBe(true)
		expect(
			matchesExcludePattern("src/stores/userStore", DEFAULT_EXCLUDE_PATTERNS),
		).toBe(true)
		expect(
			matchesExcludePattern("src/utils/helpers", DEFAULT_EXCLUDE_PATTERNS),
		).toBe(true)
		expect(
			matchesExcludePattern("src/shared/types", DEFAULT_EXCLUDE_PATTERNS),
		).toBe(true)
		expect(
			matchesExcludePattern("src/services/api", DEFAULT_EXCLUDE_PATTERNS),
		).toBe(true)
		expect(
			matchesExcludePattern("src/helpers/format", DEFAULT_EXCLUDE_PATTERNS),
		).toBe(true)
		expect(
			matchesExcludePattern("src/lib/logger", DEFAULT_EXCLUDE_PATTERNS),
		).toBe(true)
		expect(
			matchesExcludePattern("src/common/constants", DEFAULT_EXCLUDE_PATTERNS),
		).toBe(true)
	})

	it("should work with custom patterns", () => {
		const customPatterns = ["**/internal/**", "**/private/**"]
		expect(matchesExcludePattern("src/internal/helper", customPatterns)).toBe(
			true,
		)
		expect(matchesExcludePattern("src/private/secret", customPatterns)).toBe(
			true,
		)
		expect(matchesExcludePattern("src/public/api", customPatterns)).toBe(false)
	})

	it("should handle patterns with trailing slashes", () => {
		const patternsWithSlash = ["**/components/"]
		expect(
			matchesExcludePattern("src/components/Button", patternsWithSlash),
		).toBe(true)
	})

	it("should match paths with trailing slashes", () => {
		// Paths with trailing slashes still contain "/components/" so they match
		expect(
			matchesExcludePattern("src/components/", DEFAULT_EXCLUDE_PATTERNS),
		).toBe(true)
	})

	it("should return false for empty patterns array", () => {
		expect(matchesExcludePattern("src/components/Button", [])).toBe(false)
		expect(matchesExcludePattern("src/hooks/useAuth", [])).toBe(false)
	})

	it("should handle patterns that become empty after cleanup", () => {
		// Patterns like "****" or "*" become empty after cleanup
		const edgePatterns = ["****", "*", "**"]
		expect(matchesExcludePattern("src/components/Button", edgePatterns)).toBe(
			false,
		)
	})

	it("should NOT match partial directory names", () => {
		// "components2" should not be matched by "**/components/**"
		expect(
			matchesExcludePattern("src/components2/Button", DEFAULT_EXCLUDE_PATTERNS),
		).toBe(false)
		// "mycomponents" should not be matched
		expect(
			matchesExcludePattern(
				"src/mycomponents/Button",
				DEFAULT_EXCLUDE_PATTERNS,
			),
		).toBe(false)
	})
})

describe("DEFAULT_EXCLUDE_PATTERNS", () => {
	it("should contain expected patterns", () => {
		expect(DEFAULT_EXCLUDE_PATTERNS).toContain("**/components/**")
		expect(DEFAULT_EXCLUDE_PATTERNS).toContain("**/hooks/**")
		expect(DEFAULT_EXCLUDE_PATTERNS).toContain("**/composables/**")
		expect(DEFAULT_EXCLUDE_PATTERNS).toContain("**/shared/**")
		expect(DEFAULT_EXCLUDE_PATTERNS).toContain("**/utils/**")
		expect(DEFAULT_EXCLUDE_PATTERNS).toContain("**/stores/**")
		expect(DEFAULT_EXCLUDE_PATTERNS).toContain("**/services/**")
		expect(DEFAULT_EXCLUDE_PATTERNS).toContain("**/helpers/**")
		expect(DEFAULT_EXCLUDE_PATTERNS).toContain("**/lib/**")
		expect(DEFAULT_EXCLUDE_PATTERNS).toContain("**/common/**")
	})

	it("should have exactly 10 patterns", () => {
		expect(DEFAULT_EXCLUDE_PATTERNS).toHaveLength(10)
	})
})
