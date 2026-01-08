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
