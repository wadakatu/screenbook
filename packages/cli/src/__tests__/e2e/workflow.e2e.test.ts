import { existsSync, readFileSync, writeFileSync } from "node:fs"
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

describe("E2E: Full Workflow", () => {
	let testDir: string
	let originalCwd: string

	beforeEach(() => {
		originalCwd = process.cwd()
		testDir = createTempProjectDir()
		copyFixture("nextjs-app", testDir)
		process.chdir(testDir)
	})

	afterEach(() => {
		process.chdir(originalCwd)
		cleanupTempDir(testDir)
		vi.resetModules()
	})

	describe("init -> generate -> build -> lint flow", () => {
		it("should complete full workflow successfully", async () => {
			// Step 1: init
			const { initCommand } = await import("../../commands/init.js")
			await initCommand.run({
				values: { force: false, skipDetect: true },
			} as Parameters<typeof initCommand.run>[0])

			expect(existsSync(join(testDir, "screenbook.config.ts"))).toBe(true)
			expect(existsSync(join(testDir, ".gitignore"))).toBe(true)

			// Update config with routesPattern for Next.js App Router
			// Note: Use plain object export for E2E tests (no @screenbook/core import)
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

			// Step 2: generate
			const { generateCommand } = await import("../../commands/generate.js")
			await generateCommand.run({
				values: { config: undefined, dryRun: false, force: false },
			} as Parameters<typeof generateCommand.run>[0])

			// Verify screen.meta.ts files created
			expect(existsSync(join(testDir, "app/screen.meta.ts"))).toBe(true)
			expect(existsSync(join(testDir, "app/dashboard/screen.meta.ts"))).toBe(
				true,
			)
			expect(existsSync(join(testDir, "app/billing/screen.meta.ts"))).toBe(true)

			// Overwrite with plain object exports (no @screenbook/core import for E2E)
			writeFileSync(
				join(testDir, "app/screen.meta.ts"),
				`export const screen = { id: "home", title: "Home", route: "/" }`,
			)
			writeFileSync(
				join(testDir, "app/dashboard/screen.meta.ts"),
				`export const screen = { id: "dashboard", title: "Dashboard", route: "/dashboard" }`,
			)
			writeFileSync(
				join(testDir, "app/billing/screen.meta.ts"),
				`export const screen = { id: "billing", title: "Billing", route: "/billing" }`,
			)

			// Step 3: build
			const { buildCommand } = await import("../../commands/build.js")
			await buildCommand.run({
				values: { config: undefined, outDir: undefined },
			} as Parameters<typeof buildCommand.run>[0])

			// Verify outputs
			expect(existsSync(join(testDir, ".screenbook/screens.json"))).toBe(true)
			expect(existsSync(join(testDir, ".screenbook/graph.mmd"))).toBe(true)

			const screens = JSON.parse(
				readFileSync(join(testDir, ".screenbook/screens.json"), "utf-8"),
			)
			expect(screens.length).toBe(3)

			const screenIds = screens.map((s: { id: string }) => s.id)
			expect(screenIds).toContain("home")
			expect(screenIds).toContain("dashboard")
			expect(screenIds).toContain("billing")

			// Step 4: lint (should pass with 100% coverage)
			const { lintCommand } = await import("../../commands/lint.js")
			await lintCommand.run({
				values: { config: undefined },
			} as Parameters<typeof lintCommand.run>[0])

			// If we reach here without error, lint passed
		})

		it("should generate navigation graph with edges", async () => {
			// Setup with screen.meta.ts files that have navigation
			const { initCommand } = await import("../../commands/init.js")
			await initCommand.run({
				values: { force: false, skipDetect: true },
			} as Parameters<typeof initCommand.run>[0])

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

			// Create screen.meta.ts files with navigation (plain object export)
			writeFileSync(
				join(testDir, "app/screen.meta.ts"),
				`export const screen = {
	id: "home",
	title: "Home",
	route: "/",
	next: ["dashboard", "billing"],
}
`,
			)

			writeFileSync(
				join(testDir, "app/dashboard/screen.meta.ts"),
				`export const screen = {
	id: "dashboard",
	title: "Dashboard",
	route: "/dashboard",
	entryPoints: ["home"],
}
`,
			)

			writeFileSync(
				join(testDir, "app/billing/screen.meta.ts"),
				`export const screen = {
	id: "billing",
	title: "Billing",
	route: "/billing",
	entryPoints: ["home"],
}
`,
			)

			// Build
			const { buildCommand } = await import("../../commands/build.js")
			await buildCommand.run({
				values: { config: undefined, outDir: undefined },
			} as Parameters<typeof buildCommand.run>[0])

			// Verify navigation graph
			const graph = readFileSync(
				join(testDir, ".screenbook/graph.mmd"),
				"utf-8",
			)
			expect(graph).toContain("flowchart TD")
			expect(graph).toContain("home --> dashboard")
			expect(graph).toContain("home --> billing")
		})

		it("should handle generate with dry-run mode", async () => {
			const { initCommand } = await import("../../commands/init.js")
			await initCommand.run({
				values: { force: false, skipDetect: true },
			} as Parameters<typeof initCommand.run>[0])

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

			// Generate with dry-run
			const { generateCommand } = await import("../../commands/generate.js")
			await generateCommand.run({
				values: { config: undefined, dryRun: true, force: false },
			} as Parameters<typeof generateCommand.run>[0])

			// Files should NOT be created in dry-run mode
			expect(existsSync(join(testDir, "app/screen.meta.ts"))).toBe(false)
			expect(existsSync(join(testDir, "app/dashboard/screen.meta.ts"))).toBe(
				false,
			)
		})
	})
})
