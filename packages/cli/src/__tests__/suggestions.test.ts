import { describe, expect, it } from "vitest"
import {
	findBestMatch,
	findSimilar,
	formatSuggestions,
	levenshteinDistance,
} from "../utils/suggestions.js"

describe("levenshteinDistance", () => {
	it("returns 0 for identical strings", () => {
		expect(levenshteinDistance("hello", "hello")).toBe(0)
	})

	it("returns the length of the other string when one is empty", () => {
		expect(levenshteinDistance("", "hello")).toBe(5)
		expect(levenshteinDistance("hello", "")).toBe(5)
	})

	it("counts single character substitution", () => {
		expect(levenshteinDistance("cat", "bat")).toBe(1)
	})

	it("counts single character insertion", () => {
		expect(levenshteinDistance("cat", "cats")).toBe(1)
	})

	it("counts single character deletion", () => {
		expect(levenshteinDistance("cats", "cat")).toBe(1)
	})

	it("handles multiple edits", () => {
		expect(levenshteinDistance("kitten", "sitting")).toBe(3)
	})

	it("handles completely different strings", () => {
		expect(levenshteinDistance("abc", "xyz")).toBe(3)
	})
})

describe("findSimilar", () => {
	const candidates = ["users", "billing", "settings", "admin", "dashboard"]

	it("returns empty array when no matches within distance threshold", () => {
		const result = findSimilar("xyz", candidates)
		expect(result).toEqual([])
	})

	it("finds exact prefix match", () => {
		const result = findSimilar("user", candidates)
		expect(result).toContain("users")
	})

	it("finds typo corrections", () => {
		const result = findSimilar("billin", candidates)
		expect(result).toContain("billing")
	})

	it("finds similar strings", () => {
		const result = findSimilar("setings", candidates)
		expect(result).toContain("settings")
	})

	it("respects maxSuggestions option", () => {
		const manyMatches = ["test1", "test2", "test3", "test4", "test5"]
		const result = findSimilar("test", manyMatches, { maxSuggestions: 2 })
		expect(result.length).toBeLessThanOrEqual(2)
	})

	it("accepts Set as candidates", () => {
		const candidateSet = new Set(candidates)
		const result = findSimilar("user", candidateSet)
		expect(result).toContain("users")
	})

	it("sorts by distance (closest first)", () => {
		const orderedCandidates = ["test", "tests", "testing", "tested"]
		const result = findSimilar("test", orderedCandidates)
		// "test" should be first (distance 0), then others
		expect(result[0]).toBe("test")
	})

	it("handles empty candidates", () => {
		const result = findSimilar("test", [])
		expect(result).toEqual([])
	})

	it("handles empty target string", () => {
		const result = findSimilar("", ["test", "users"])
		// Empty string has maxDistance = 0, so only exact empty matches work
		expect(result).toEqual([])
	})

	it("uses custom maxDistanceRatio", () => {
		// With default 0.4 ratio: "billing" (7 chars) -> threshold = ceil(2.8) = 3
		// "billing" vs "billing" = 0 (matches)
		// "billing" vs "billings" = 1 (matches)
		// With 0.9 ratio: "billing" (7 chars) -> threshold = ceil(6.3) = 7
		// "billing" vs "settings" = 4 (matches with 0.9, won't match with 0.4)
		const resultDefault = findSimilar("billing", ["settings"], {
			maxDistanceRatio: 0.4,
		})
		expect(resultDefault).toEqual([]) // distance 4 > threshold 3

		const resultLenient = findSimilar("billing", ["settings"], {
			maxDistanceRatio: 0.9,
		})
		expect(resultLenient).toContain("settings") // distance 4 <= threshold 7
	})
})

describe("findBestMatch", () => {
	const candidates = ["users", "billing", "settings"]

	it("returns the single best match", () => {
		const result = findBestMatch("user", candidates)
		expect(result).toBe("users")
	})

	it("returns undefined when no match is found", () => {
		const result = findBestMatch("xyz", candidates)
		expect(result).toBeUndefined()
	})

	it("works with Set candidates", () => {
		const result = findBestMatch("billin", new Set(candidates))
		expect(result).toBe("billing")
	})

	it("uses custom maxDistanceRatio parameter", () => {
		// With default 0.4 ratio: "billing" (7 chars) -> threshold = 3
		// "billing" vs "settings" = 4 (no match)
		const strictResult = findBestMatch("billing", ["settings"], 0.4)
		expect(strictResult).toBeUndefined()

		// With 0.9 ratio: "billing" (7 chars) -> threshold = 7
		// "billing" vs "settings" = 4 (match)
		const lenientResult = findBestMatch("billing", ["settings"], 0.9)
		expect(lenientResult).toBe("settings")
	})
})

describe("formatSuggestions", () => {
	it("returns empty string for empty array", () => {
		const result = formatSuggestions([])
		expect(result).toBe("")
	})

	it("formats single suggestion", () => {
		const result = formatSuggestions(["users"])
		expect(result).toContain("Did you mean one of these?")
		expect(result).toContain("- users")
	})

	it("formats multiple suggestions", () => {
		const result = formatSuggestions(["users", "billing", "settings"])
		expect(result).toContain("Did you mean one of these?")
		expect(result).toContain("- users")
		expect(result).toContain("- billing")
		expect(result).toContain("- settings")
	})

	it("indents suggestions with two spaces", () => {
		const result = formatSuggestions(["test"])
		const lines = result.split("\n")
		expect(lines[1]).toMatch(/^\s{2}-/)
	})
})

describe("integration: screen ID suggestions", () => {
	const screenIds = [
		"billing.invoice.list",
		"billing.invoice.detail",
		"billing.payment.start",
		"users.profile",
		"users.settings",
		"admin.dashboard",
	]

	it("suggests similar screen IDs for typos", () => {
		// "billing.invoice.lst" is close to "billing.invoice.list"
		const result = findSimilar("billing.invoice.lst", screenIds)
		expect(result).toContain("billing.invoice.list")
	})

	it("suggests when missing last segment", () => {
		const result = findSimilar("billing.invoice", screenIds)
		expect(result.length).toBeGreaterThan(0)
	})

	it("handles completely wrong namespace", () => {
		const result = findSimilar("orders.list", screenIds)
		// Should return empty or very few matches since "orders" is not similar to any namespace
		expect(result.length).toBeLessThanOrEqual(1)
	})
})
