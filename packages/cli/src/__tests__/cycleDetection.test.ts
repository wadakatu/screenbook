import type { Screen } from "@screenbook/core"
import { describe, expect, it } from "vitest"
import {
	detectCycles,
	formatCycleWarnings,
	getCycleSummary,
} from "../utils/cycleDetection.js"

describe("detectCycles", () => {
	it("should return no cycles for acyclic graph", () => {
		const screens: Screen[] = [
			{ id: "A", title: "A", route: "/a", next: ["B"] },
			{ id: "B", title: "B", route: "/b", next: ["C"] },
			{ id: "C", title: "C", route: "/c" },
		]

		const result = detectCycles(screens)
		expect(result.hasCycles).toBe(false)
		expect(result.cycles).toHaveLength(0)
		expect(result.disallowedCycles).toHaveLength(0)
	})

	it("should detect simple cycle (A → B → A)", () => {
		const screens: Screen[] = [
			{ id: "A", title: "A", route: "/a", next: ["B"] },
			{ id: "B", title: "B", route: "/b", next: ["A"] },
		]

		const result = detectCycles(screens)
		expect(result.hasCycles).toBe(true)
		expect(result.cycles).toHaveLength(1)
		expect(result.cycles[0]?.cycle).toEqual(["A", "B", "A"])
		expect(result.cycles[0]?.allowed).toBe(false)
		expect(result.disallowedCycles).toHaveLength(1)
	})

	it("should detect longer cycle (A → B → C → A)", () => {
		const screens: Screen[] = [
			{ id: "A", title: "A", route: "/a", next: ["B"] },
			{ id: "B", title: "B", route: "/b", next: ["C"] },
			{ id: "C", title: "C", route: "/c", next: ["A"] },
		]

		const result = detectCycles(screens)
		expect(result.hasCycles).toBe(true)
		expect(result.cycles).toHaveLength(1)
		expect(result.cycles[0]?.cycle).toEqual(["A", "B", "C", "A"])
		expect(result.disallowedCycles).toHaveLength(1)
	})

	it("should detect self-reference (A → A)", () => {
		const screens: Screen[] = [
			{ id: "A", title: "A", route: "/a", next: ["A"] },
		]

		const result = detectCycles(screens)
		expect(result.hasCycles).toBe(true)
		expect(result.cycles).toHaveLength(1)
		expect(result.cycles[0]?.cycle).toEqual(["A", "A"])
	})

	it("should handle screens without next field", () => {
		const screens: Screen[] = [
			{ id: "A", title: "A", route: "/a" },
			{ id: "B", title: "B", route: "/b" },
		]

		const result = detectCycles(screens)
		expect(result.hasCycles).toBe(false)
		expect(result.cycles).toHaveLength(0)
	})

	it("should handle empty screens array", () => {
		const screens: Screen[] = []

		const result = detectCycles(screens)
		expect(result.hasCycles).toBe(false)
		expect(result.cycles).toHaveLength(0)
	})

	it("should allow cycle when any screen has allowCycles: true", () => {
		const screens: Screen[] = [
			{ id: "A", title: "A", route: "/a", next: ["B"], allowCycles: true },
			{ id: "B", title: "B", route: "/b", next: ["A"] },
		]

		const result = detectCycles(screens)
		expect(result.hasCycles).toBe(true)
		expect(result.cycles).toHaveLength(1)
		expect(result.cycles[0]?.allowed).toBe(true)
		expect(result.disallowedCycles).toHaveLength(0)
	})

	it("should allow cycle when allowCycles is on any node in cycle", () => {
		const screens: Screen[] = [
			{ id: "A", title: "A", route: "/a", next: ["B"] },
			{ id: "B", title: "B", route: "/b", next: ["C"] },
			{ id: "C", title: "C", route: "/c", next: ["A"], allowCycles: true },
		]

		const result = detectCycles(screens)
		expect(result.hasCycles).toBe(true)
		expect(result.cycles[0]?.allowed).toBe(true)
		expect(result.disallowedCycles).toHaveLength(0)
	})

	it("should detect multiple independent cycles", () => {
		const screens: Screen[] = [
			// Cycle 1: A → B → A
			{ id: "A", title: "A", route: "/a", next: ["B"] },
			{ id: "B", title: "B", route: "/b", next: ["A"] },
			// Cycle 2: C → D → C
			{ id: "C", title: "C", route: "/c", next: ["D"] },
			{ id: "D", title: "D", route: "/d", next: ["C"] },
		]

		const result = detectCycles(screens)
		expect(result.hasCycles).toBe(true)
		expect(result.cycles.length).toBeGreaterThanOrEqual(2)
	})

	it("should ignore references to non-existent screens", () => {
		const screens: Screen[] = [
			{ id: "A", title: "A", route: "/a", next: ["nonexistent"] },
		]

		const result = detectCycles(screens)
		expect(result.hasCycles).toBe(false)
	})

	it("should handle mixed allowed and disallowed cycles", () => {
		const screens: Screen[] = [
			// Allowed cycle: A → B → A
			{ id: "A", title: "A", route: "/a", next: ["B"], allowCycles: true },
			{ id: "B", title: "B", route: "/b", next: ["A"] },
			// Disallowed cycle: C → D → C
			{ id: "C", title: "C", route: "/c", next: ["D"] },
			{ id: "D", title: "D", route: "/d", next: ["C"] },
		]

		const result = detectCycles(screens)
		expect(result.hasCycles).toBe(true)

		const allowedCycles = result.cycles.filter((c) => c.allowed)
		const disallowedCycles = result.cycles.filter((c) => !c.allowed)

		expect(allowedCycles.length).toBeGreaterThanOrEqual(1)
		expect(disallowedCycles.length).toBeGreaterThanOrEqual(1)
		expect(result.disallowedCycles).toEqual(disallowedCycles)
	})
})

describe("formatCycleWarnings", () => {
	it("should format cycle paths with arrows", () => {
		const cycles = [{ cycle: ["A", "B", "C", "A"], allowed: false }]

		const output = formatCycleWarnings(cycles)
		expect(output).toContain("Cycle 1:")
		expect(output).toContain("A → B → C → A")
	})

	it("should indicate allowed cycles", () => {
		const cycles = [{ cycle: ["A", "B", "A"], allowed: true }]

		const output = formatCycleWarnings(cycles)
		expect(output).toContain("(allowed)")
	})

	it("should format multiple cycles", () => {
		const cycles = [
			{ cycle: ["A", "B", "A"], allowed: false },
			{ cycle: ["C", "D", "C"], allowed: true },
		]

		const output = formatCycleWarnings(cycles)
		expect(output).toContain("Cycle 1:")
		expect(output).toContain("Cycle 2 (allowed):")
	})

	it("should return empty string for no cycles", () => {
		const output = formatCycleWarnings([])
		expect(output).toBe("")
	})
})

describe("getCycleSummary", () => {
	it("should return no cycles message", () => {
		const result = {
			hasCycles: false,
			cycles: [],
			disallowedCycles: [],
		}

		expect(getCycleSummary(result)).toBe("No circular navigation detected")
	})

	it("should handle all allowed cycles", () => {
		const result = {
			hasCycles: true,
			cycles: [{ cycle: ["A", "B", "A"], allowed: true }],
			disallowedCycles: [],
		}

		expect(getCycleSummary(result)).toBe(
			"1 circular navigation detected (all allowed)",
		)
	})

	it("should handle all disallowed cycles", () => {
		const result = {
			hasCycles: true,
			cycles: [{ cycle: ["A", "B", "A"], allowed: false }],
			disallowedCycles: [{ cycle: ["A", "B", "A"], allowed: false }],
		}

		expect(getCycleSummary(result)).toBe("1 circular navigation detected")
	})

	it("should handle mixed allowed and disallowed", () => {
		const result = {
			hasCycles: true,
			cycles: [
				{ cycle: ["A", "B", "A"], allowed: true },
				{ cycle: ["C", "D", "C"], allowed: false },
			],
			disallowedCycles: [{ cycle: ["C", "D", "C"], allowed: false }],
		}

		expect(getCycleSummary(result)).toBe(
			"2 circular navigations detected (1 not allowed, 1 allowed)",
		)
	})

	it("should use correct pluralization", () => {
		const result = {
			hasCycles: true,
			cycles: [
				{ cycle: ["A", "B", "A"], allowed: false },
				{ cycle: ["C", "D", "C"], allowed: false },
			],
			disallowedCycles: [
				{ cycle: ["A", "B", "A"], allowed: false },
				{ cycle: ["C", "D", "C"], allowed: false },
			],
		}

		expect(getCycleSummary(result)).toBe("2 circular navigations detected")
	})
})
