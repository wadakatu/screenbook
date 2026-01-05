import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
	generateShieldsJson,
	generateSimpleJson,
	generateSvgBadge,
} from "../commands/badge.js"

describe("badge command", () => {
	describe("generateSvgBadge", () => {
		it("should generate valid SVG", () => {
			const svg = generateSvgBadge(85)
			expect(svg).toContain("<svg")
			expect(svg).toContain("</svg>")
			expect(svg).toContain("screenbook")
			expect(svg).toContain("85%")
		})

		it("should use green color for 80%+ coverage", () => {
			const svg = generateSvgBadge(80)
			expect(svg).toContain("#4c1") // Green
		})

		it("should use green color for 100% coverage", () => {
			const svg = generateSvgBadge(100)
			expect(svg).toContain("#4c1") // Green
		})

		it("should use yellow color for 50-79% coverage", () => {
			const svg = generateSvgBadge(50)
			expect(svg).toContain("#dfb317") // Yellow
		})

		it("should use yellow color for 79% coverage", () => {
			const svg = generateSvgBadge(79)
			expect(svg).toContain("#dfb317") // Yellow
		})

		it("should use red color for below 50% coverage", () => {
			const svg = generateSvgBadge(49)
			expect(svg).toContain("#e05d44") // Red
		})

		it("should use red color for 0% coverage", () => {
			const svg = generateSvgBadge(0)
			expect(svg).toContain("#e05d44") // Red
		})

		it("should support flat style (default)", () => {
			const svg = generateSvgBadge(85, "flat")
			expect(svg).toContain('rx="3"') // Rounded corners
		})

		it("should support flat-square style", () => {
			const svg = generateSvgBadge(85, "flat-square")
			expect(svg).toContain('rx="0"') // No rounded corners
		})
	})

	describe("generateShieldsJson", () => {
		it("should generate valid shields.io JSON", () => {
			const json = generateShieldsJson(85)
			expect(json).toEqual({
				schemaVersion: 1,
				label: "screenbook",
				message: "85%",
				color: "brightgreen",
			})
		})

		it("should use brightgreen for 80%+ coverage", () => {
			const json = generateShieldsJson(80) as { color: string }
			expect(json.color).toBe("brightgreen")
		})

		it("should use yellow for 50-79% coverage", () => {
			const json = generateShieldsJson(65) as { color: string }
			expect(json.color).toBe("yellow")
		})

		it("should use red for below 50% coverage", () => {
			const json = generateShieldsJson(25) as { color: string }
			expect(json.color).toBe("red")
		})
	})

	describe("generateSimpleJson", () => {
		it("should generate coverage data JSON", () => {
			const json = generateSimpleJson({
				percentage: 75,
				covered: 15,
				total: 20,
			})
			expect(json).toEqual({
				percentage: 75,
				covered: 15,
				total: 20,
			})
		})

		it("should handle 0% coverage", () => {
			const json = generateSimpleJson({
				percentage: 0,
				covered: 0,
				total: 10,
			})
			expect(json).toEqual({
				percentage: 0,
				covered: 0,
				total: 10,
			})
		})

		it("should handle empty project", () => {
			const json = generateSimpleJson({
				percentage: 0,
				covered: 0,
				total: 0,
			})
			expect(json).toEqual({
				percentage: 0,
				covered: 0,
				total: 0,
			})
		})
	})

	describe("integration", () => {
		const testDir = join(process.cwd(), ".test-badge")

		beforeEach(() => {
			if (existsSync(testDir)) {
				rmSync(testDir, { recursive: true })
			}
			mkdirSync(testDir, { recursive: true })
		})

		afterEach(() => {
			if (existsSync(testDir)) {
				rmSync(testDir, { recursive: true })
			}
		})

		it("should write SVG file correctly", () => {
			const svg = generateSvgBadge(85)
			const outputPath = join(testDir, "coverage-badge.svg")
			writeFileSync(outputPath, svg)

			expect(existsSync(outputPath)).toBe(true)
			const content = readFileSync(outputPath, "utf-8")
			expect(content).toContain("<svg")
			expect(content).toContain("85%")
		})

		it("should write JSON file correctly", () => {
			const json = generateShieldsJson(75)
			const outputPath = join(testDir, "coverage.json")
			writeFileSync(outputPath, JSON.stringify(json, null, 2))

			expect(existsSync(outputPath)).toBe(true)
			const content = JSON.parse(readFileSync(outputPath, "utf-8"))
			expect(content.schemaVersion).toBe(1)
			expect(content.message).toBe("75%")
		})
	})
})
