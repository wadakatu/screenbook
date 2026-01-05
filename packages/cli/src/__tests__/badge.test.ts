import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	generateShieldsJson,
	generateSimpleJson,
	generateSvgBadge,
} from "../commands/badge.js"

// Mock console.log to suppress output during tests
vi.spyOn(console, "log").mockImplementation(() => {})

// Mock process.exit to prevent test termination
const mockExit = vi.spyOn(process, "exit").mockImplementation((code) => {
	throw new Error(`Process exited with code ${code}`)
})

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

	describe("file output", () => {
		const testDir = join(process.cwd(), ".test-badge-output")

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

	describe("CLI integration", () => {
		const testDir = join(process.cwd(), ".test-badge-cli")
		let originalCwd: string

		beforeEach(() => {
			originalCwd = process.cwd()
			if (existsSync(testDir)) {
				rmSync(testDir, { recursive: true })
			}
			mkdirSync(testDir, { recursive: true })
			process.chdir(testDir)
			mockExit.mockClear()
		})

		afterEach(() => {
			process.chdir(originalCwd)
			if (existsSync(testDir)) {
				rmSync(testDir, { recursive: true })
			}
			vi.resetModules()
		})

		it("should exit with error when routesPattern is not configured", async () => {
			const { badgeCommand } = await import("../commands/badge.js")

			await expect(
				badgeCommand.run({
					values: { config: undefined },
				} as Parameters<typeof badgeCommand.run>[0]),
			).rejects.toThrow("Process exited with code 1")
		})

		it("should exit with error for invalid format", async () => {
			const { badgeCommand } = await import("../commands/badge.js")

			await expect(
				badgeCommand.run({
					values: { format: "invalid" },
				} as Parameters<typeof badgeCommand.run>[0]),
			).rejects.toThrow("Process exited with code 1")
		})

		it("should exit with error for invalid style", async () => {
			const { badgeCommand } = await import("../commands/badge.js")

			await expect(
				badgeCommand.run({
					values: { format: "svg", style: "invalid" },
				} as Parameters<typeof badgeCommand.run>[0]),
			).rejects.toThrow("Process exited with code 1")
		})

		it("should generate SVG badge with valid config", async () => {
			// Create config
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`
				import { defineConfig } from "@screenbook/core"
				export default defineConfig({
					metaPattern: "src/pages/**/screen.meta.ts",
					routesPattern: "src/pages/**/page.tsx",
				})
			`,
			)

			// Create route with screen.meta.ts
			const pagesDir = join(testDir, "src/pages/home")
			mkdirSync(pagesDir, { recursive: true })
			writeFileSync(
				join(pagesDir, "page.tsx"),
				"export default function Home() {}",
			)
			writeFileSync(
				join(pagesDir, "screen.meta.ts"),
				`export const screen = { id: "home", title: "Home", route: "/" }`,
			)

			const { badgeCommand } = await import("../commands/badge.js")

			await badgeCommand.run({
				values: { config: undefined },
			} as Parameters<typeof badgeCommand.run>[0])

			// Should generate badge file
			const badgePath = join(testDir, ".screenbook/coverage-badge.svg")
			expect(existsSync(badgePath)).toBe(true)
			const content = readFileSync(badgePath, "utf-8")
			expect(content).toContain("<svg")
			expect(content).toContain("100%")
			expect(content).toContain("#4c1") // Green for 100%
		})

		it("should generate shields-json format", async () => {
			// Create config
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`
				import { defineConfig } from "@screenbook/core"
				export default defineConfig({
					metaPattern: "src/pages/**/screen.meta.ts",
					routesPattern: "src/pages/**/page.tsx",
				})
			`,
			)

			// Create route with screen.meta.ts
			const pagesDir = join(testDir, "src/pages/home")
			mkdirSync(pagesDir, { recursive: true })
			writeFileSync(
				join(pagesDir, "page.tsx"),
				"export default function Home() {}",
			)
			writeFileSync(
				join(pagesDir, "screen.meta.ts"),
				`export const screen = { id: "home", title: "Home", route: "/" }`,
			)

			const { badgeCommand } = await import("../commands/badge.js")

			await badgeCommand.run({
				values: { format: "shields-json" },
			} as Parameters<typeof badgeCommand.run>[0])

			// Should generate JSON file
			const jsonPath = join(testDir, ".screenbook/coverage.json")
			expect(existsSync(jsonPath)).toBe(true)
			const content = JSON.parse(readFileSync(jsonPath, "utf-8"))
			expect(content.schemaVersion).toBe(1)
			expect(content.label).toBe("screenbook")
			expect(content.message).toBe("100%")
			expect(content.color).toBe("brightgreen")
		})

		it("should generate badge with custom output path", async () => {
			// Create config
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`
				import { defineConfig } from "@screenbook/core"
				export default defineConfig({
					metaPattern: "src/pages/**/screen.meta.ts",
					routesPattern: "src/pages/**/page.tsx",
				})
			`,
			)

			// Create route with screen.meta.ts
			const pagesDir = join(testDir, "src/pages/home")
			mkdirSync(pagesDir, { recursive: true })
			writeFileSync(
				join(pagesDir, "page.tsx"),
				"export default function Home() {}",
			)
			writeFileSync(
				join(pagesDir, "screen.meta.ts"),
				`export const screen = { id: "home", title: "Home", route: "/" }`,
			)

			const customOutputPath = join(testDir, "badges/my-badge.svg")
			const { badgeCommand } = await import("../commands/badge.js")

			await badgeCommand.run({
				values: { output: customOutputPath },
			} as Parameters<typeof badgeCommand.run>[0])

			expect(existsSync(customOutputPath)).toBe(true)
		})

		it("should generate 0% badge when no routes have screen.meta.ts", async () => {
			// Create config
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`
				import { defineConfig } from "@screenbook/core"
				export default defineConfig({
					metaPattern: "src/pages/**/screen.meta.ts",
					routesPattern: "src/pages/**/page.tsx",
				})
			`,
			)

			// Create route without screen.meta.ts
			const pagesDir = join(testDir, "src/pages/about")
			mkdirSync(pagesDir, { recursive: true })
			writeFileSync(
				join(pagesDir, "page.tsx"),
				"export default function About() {}",
			)

			const { badgeCommand } = await import("../commands/badge.js")

			await badgeCommand.run({
				values: { config: undefined },
			} as Parameters<typeof badgeCommand.run>[0])

			// Should generate badge with 0%
			const badgePath = join(testDir, ".screenbook/coverage-badge.svg")
			expect(existsSync(badgePath)).toBe(true)
			const content = readFileSync(badgePath, "utf-8")
			expect(content).toContain("0%")
			expect(content).toContain("#e05d44") // Red for 0%
		})
	})
})
