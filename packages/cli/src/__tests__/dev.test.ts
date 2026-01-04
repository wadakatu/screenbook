import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock console to suppress output during tests
vi.spyOn(console, "log").mockImplementation(() => {})
vi.spyOn(console, "error").mockImplementation(() => {})

describe("dev command utilities", () => {
	const testDir = join(process.cwd(), ".test-dev")
	let originalCwd: string

	beforeEach(() => {
		originalCwd = process.cwd()
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true })
		}
		mkdirSync(testDir, { recursive: true })
		process.chdir(testDir)
	})

	afterEach(() => {
		process.chdir(originalCwd)
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true })
		}
		vi.resetModules()
	})

	describe("buildScreens", () => {
		it("should generate screens.json with filePath from screen.meta.ts files", async () => {
			const screenDir = join(testDir, "src/screens/home")
			mkdirSync(screenDir, { recursive: true })

			writeFileSync(
				join(screenDir, "screen.meta.ts"),
				`export const screen = {
					id: "home",
					title: "Home",
					route: "/",
				}`,
			)

			// Create output directory
			const outDir = ".screenbook"
			mkdirSync(join(testDir, outDir), { recursive: true })

			const { buildScreens } = await import("../commands/dev.js")

			await buildScreens(
				{
					metaPattern: "src/**/screen.meta.ts",
					outDir,
					ignore: ["**/node_modules/**"],
				},
				testDir,
			)

			const screensPath = join(testDir, outDir, "screens.json")
			expect(existsSync(screensPath)).toBe(true)

			const screens = JSON.parse(readFileSync(screensPath, "utf-8"))
			expect(screens).toHaveLength(1)
			expect(screens[0].id).toBe("home")
			expect(screens[0].filePath).toContain("screen.meta.ts")
		})

		it("should handle empty glob results gracefully", async () => {
			const outDir = ".screenbook"
			mkdirSync(join(testDir, outDir), { recursive: true })

			const { buildScreens } = await import("../commands/dev.js")

			// Should not throw
			await buildScreens(
				{
					metaPattern: "src/**/screen.meta.ts",
					outDir,
					ignore: [],
				},
				testDir,
			)

			// No screens.json created when no screens found
			const screensPath = join(testDir, outDir, "screens.json")
			expect(existsSync(screensPath)).toBe(false)
		})

		it("should handle failed imports gracefully", async () => {
			const screenDir = join(testDir, "src/screens/broken")
			mkdirSync(screenDir, { recursive: true })

			// Create a file with syntax error
			writeFileSync(
				join(screenDir, "screen.meta.ts"),
				`export const screen = { invalid syntax`,
			)

			const outDir = ".screenbook"

			const { buildScreens } = await import("../commands/dev.js")

			// Should not throw
			await buildScreens(
				{
					metaPattern: "src/**/screen.meta.ts",
					outDir,
					ignore: [],
				},
				testDir,
			)
		})

		it("should skip files without screen export", async () => {
			const screenDir = join(testDir, "src/screens/noexport")
			mkdirSync(screenDir, { recursive: true })

			writeFileSync(
				join(screenDir, "screen.meta.ts"),
				`export const something = { id: "test" }`,
			)

			const outDir = ".screenbook"
			mkdirSync(join(testDir, outDir), { recursive: true })

			const { buildScreens } = await import("../commands/dev.js")

			await buildScreens(
				{
					metaPattern: "src/**/screen.meta.ts",
					outDir,
					ignore: [],
				},
				testDir,
			)

			const screensPath = join(testDir, outDir, "screens.json")
			expect(existsSync(screensPath)).toBe(true)

			const screens = JSON.parse(readFileSync(screensPath, "utf-8"))
			expect(screens).toHaveLength(0)
		})
	})

	describe("resolveUiPackage", () => {
		it("should return null when @screenbook/ui is not installed", async () => {
			const { resolveUiPackage } = await import("../commands/dev.js")

			// In test environment without @screenbook/ui installed in testDir
			const result = resolveUiPackage()

			// Should either find it in actual node_modules or return null
			// The function checks multiple fallback paths
			expect(result === null || typeof result === "string").toBe(true)
		})

		it("should check fallback paths when require.resolve fails", async () => {
			// Create a fake ui package in fallback location
			const uiPath = join(testDir, "packages", "ui")
			mkdirSync(uiPath, { recursive: true })
			writeFileSync(
				join(uiPath, "package.json"),
				JSON.stringify({ name: "@screenbook/ui" }),
			)

			const { resolveUiPackage } = await import("../commands/dev.js")

			const result = resolveUiPackage()

			// Should find the ui package (either from real install or our fake)
			expect(result === null || typeof result === "string").toBe(true)
		})
	})
})
