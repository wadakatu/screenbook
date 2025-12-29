import { describe, expect, it } from "vitest"
import { parseCommaSeparated } from "../commands/generate.js"

describe("generate command", () => {
	describe("parseCommaSeparated", () => {
		it("should parse comma-separated values", () => {
			expect(parseCommaSeparated("a, b, c")).toEqual(["a", "b", "c"])
		})

		it("should trim whitespace from values", () => {
			expect(parseCommaSeparated("  foo  ,  bar  ,  baz  ")).toEqual([
				"foo",
				"bar",
				"baz",
			])
		})

		it("should return empty array for empty string", () => {
			expect(parseCommaSeparated("")).toEqual([])
		})

		it("should return empty array for whitespace-only string", () => {
			expect(parseCommaSeparated("   ")).toEqual([])
		})

		it("should filter out empty segments", () => {
			expect(parseCommaSeparated("a,,b,  ,c")).toEqual(["a", "b", "c"])
		})

		it("should handle single value", () => {
			expect(parseCommaSeparated("single")).toEqual(["single"])
		})

		it("should handle values with spaces", () => {
			expect(parseCommaSeparated("team alpha, team beta")).toEqual([
				"team alpha",
				"team beta",
			])
		})
	})
})
