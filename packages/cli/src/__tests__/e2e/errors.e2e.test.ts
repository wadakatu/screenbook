import { existsSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	cleanupTempDir,
	copyFixture,
	createTempProjectDir,
} from "./helpers/fixtures.js"

// Mock console to suppress output during tests
vi.spyOn(console, "log").mockImplementation(() => {})
vi.spyOn(console, "error").mockImplementation(() => {})

// Mock process.exit to prevent test termination
const mockExit = vi.spyOn(process, "exit").mockImplementation((code) => {
	throw new Error(`Process exited with code ${code}`)
})

describe("E2E: Error Scenarios", () => {
	let testDir: string
	let originalCwd: string

	beforeEach(() => {
		originalCwd = process.cwd()
		testDir = createTempProjectDir()
		process.chdir(testDir)
		mockExit.mockClear()
	})

	afterEach(() => {
		process.chdir(originalCwd)
		cleanupTempDir(testDir)
		vi.resetModules()
	})

	describe("No config file", () => {
		it("should use default config when no screenbook.config.ts exists", async () => {
			copyFixture("empty-project", testDir)

			const { loadConfig } = await import("../../utils/config.js")

			// Should not throw, uses defaults
			const config = await loadConfig()
			expect(config.metaPattern).toBe("src/**/screen.meta.ts")
			expect(config.outDir).toBe(".screenbook")
		})

		it("should handle init in empty project", async () => {
			copyFixture("empty-project", testDir)

			const { initCommand } = await import("../../commands/init.js")
			await initCommand.run({
				values: { force: false, skipDetect: true },
			} as Parameters<typeof initCommand.run>[0])

			expect(existsSync(join(testDir, "screenbook.config.ts"))).toBe(true)
		})
	})

	describe("Missing routesPattern", () => {
		it("should exit with error when lint is called without routesPattern", async () => {
			copyFixture("empty-project", testDir)

			// Create config without routesPattern
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default { outDir: ".screenbook", metaPattern: "src/**/screen.meta.ts", ignore: [] }`,
			)

			const { lintCommand } = await import("../../commands/lint.js")

			await expect(
				lintCommand.run({
					values: { config: undefined },
				} as Parameters<typeof lintCommand.run>[0]),
			).rejects.toThrow("Process exited with code 1")
		})

		it("should exit with error when generate is called without routesPattern", async () => {
			copyFixture("empty-project", testDir)

			// Create config without routesPattern
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default { outDir: ".screenbook", metaPattern: "src/**/screen.meta.ts", ignore: [] }`,
			)

			const { generateCommand } = await import("../../commands/generate.js")

			await expect(
				generateCommand.run({
					values: { config: undefined, dryRun: false, force: false },
				} as Parameters<typeof generateCommand.run>[0]),
			).rejects.toThrow("Process exited with code 1")
		})
	})

	describe("Invalid meta files", () => {
		it("should handle build with no screen.meta.ts files", async () => {
			copyFixture("nextjs-app", testDir)

			// Create config but don't create any screen.meta.ts files
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default {
	metaPattern: "app/**/screen.meta.ts",
	routesPattern: "app/**/page.tsx",
	outDir: ".screenbook",
	ignore: [],
}
`,
			)

			const { buildCommand } = await import("../../commands/build.js")

			// Should not throw when no screens found
			await buildCommand.run({
				values: { config: undefined, outDir: undefined },
			} as Parameters<typeof buildCommand.run>[0])

			// screens.json should not be created
			expect(existsSync(join(testDir, ".screenbook/screens.json"))).toBe(false)
		})

		it("should handle lint failure when coverage is below 100%", async () => {
			copyFixture("nextjs-app", testDir)

			// Create config
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default {
	metaPattern: "app/**/screen.meta.ts",
	routesPattern: "app/**/page.tsx",
	outDir: ".screenbook",
	ignore: [],
}
`,
			)

			// Create only one screen.meta.ts (partial coverage)
			writeFileSync(
				join(testDir, "app/screen.meta.ts"),
				`export const screen = { id: "home", title: "Home", route: "/" }`,
			)

			const { lintCommand } = await import("../../commands/lint.js")

			// Should fail because only 1/3 routes are covered
			await expect(
				lintCommand.run({
					values: { config: undefined },
				} as Parameters<typeof lintCommand.run>[0]),
			).rejects.toThrow("Process exited with code 1")
		})
	})

	describe("Screen validation", () => {
		it("should report invalid screen references", async () => {
			copyFixture("nextjs-app", testDir)

			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default {
	metaPattern: "app/**/screen.meta.ts",
	routesPattern: "app/**/page.tsx",
	outDir: ".screenbook",
	ignore: [],
}
`,
			)

			// Create screen with invalid next reference
			writeFileSync(
				join(testDir, "app/screen.meta.ts"),
				`export const screen = {
	id: "home",
	title: "Home",
	route: "/",
	next: ["nonexistent-screen"],
}
`,
			)

			writeFileSync(
				join(testDir, "app/dashboard/screen.meta.ts"),
				`export const screen = {
	id: "dashboard",
	title: "Dashboard",
	route: "/dashboard",
}
`,
			)

			writeFileSync(
				join(testDir, "app/billing/screen.meta.ts"),
				`export const screen = {
	id: "billing",
	title: "Billing",
	route: "/billing",
}
`,
			)

			const { buildCommand } = await import("../../commands/build.js")

			// Build should complete but log validation warnings
			await buildCommand.run({
				values: { config: undefined, outDir: undefined },
			} as Parameters<typeof buildCommand.run>[0])

			// screens.json should still be created
			expect(existsSync(join(testDir, ".screenbook/screens.json"))).toBe(true)
		})
	})
})
