import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock console.log to suppress output during tests
vi.spyOn(console, "log").mockImplementation(() => {})

// Mock process.exit to prevent test termination
const mockExit = vi.spyOn(process, "exit").mockImplementation((code) => {
	throw new Error(`Process exited with code ${code}`)
})

describe("lint command", () => {
	const testDir = join(process.cwd(), ".test-lint")
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

	it("should show message when routesPattern is not configured", async () => {
		const { lintCommand } = await import("../commands/lint.js")

		// Should not throw when routesPattern is not configured
		await lintCommand.run({
			values: { config: undefined, fix: false },
		} as Parameters<typeof lintCommand.run>[0])

		// Should not exit with error
		expect(mockExit).not.toHaveBeenCalled()
	})

	it("should pass when all routes have screen.meta.ts", async () => {
		// Create config with routesPattern
		writeFileSync(
			join(testDir, "screenbook.config.ts"),
			`
			import { defineConfig } from "@screenbook/core"
			export default defineConfig({
				screensDir: "src/screens",
				routesPattern: "src/pages/**/*.vue",
			})
		`,
		)

		// Create route file
		const pagesDir = join(testDir, "src/pages/home")
		mkdirSync(pagesDir, { recursive: true })
		writeFileSync(join(pagesDir, "index.vue"), "<template>Home</template>")

		// Create corresponding screen.meta.ts
		const screensDir = join(testDir, "src/screens/home")
		mkdirSync(screensDir, { recursive: true })
		writeFileSync(
			join(screensDir, "screen.meta.ts"),
			`
			export const screen = {
				id: "home",
				title: "Home",
				route: "/",
			}
		`,
		)

		const { lintCommand } = await import("../commands/lint.js")

		await lintCommand.run({
			values: { config: undefined, fix: false },
		} as Parameters<typeof lintCommand.run>[0])

		// Should not exit with error when all routes are covered
		expect(mockExit).not.toHaveBeenCalled()
	})

	it("should fail when routes are missing screen.meta.ts", async () => {
		// Create config with routesPattern
		writeFileSync(
			join(testDir, "screenbook.config.ts"),
			`
			import { defineConfig } from "@screenbook/core"
			export default defineConfig({
				screensDir: "src/screens",
				routesPattern: "src/pages/**/*.vue",
			})
		`,
		)

		// Create route file without corresponding screen.meta.ts
		const pagesDir = join(testDir, "src/pages/about")
		mkdirSync(pagesDir, { recursive: true })
		writeFileSync(join(pagesDir, "index.vue"), "<template>About</template>")

		// Create empty screens directory
		mkdirSync(join(testDir, "src/screens"), { recursive: true })

		const { lintCommand } = await import("../commands/lint.js")

		await expect(
			lintCommand.run({
				values: { config: undefined, fix: false },
			} as Parameters<typeof lintCommand.run>[0]),
		).rejects.toThrow("Process exited with code 1")
	})

	it("should return early when no route files found", async () => {
		// Create config with routesPattern pointing to non-existent directory
		writeFileSync(
			join(testDir, "screenbook.config.ts"),
			`export default { screensDir: "src/screens", outDir: ".screenbook", metaPattern: "**/screen.meta.ts", routesPattern: "src/nonexistent/**/*.vue", lintIgnore: [] }`,
		)

		// Create empty screens directory
		mkdirSync(join(testDir, "src/screens"), { recursive: true })

		const { lintCommand } = await import("../commands/lint.js")

		// Should not fail when no routes are found
		await lintCommand.run({
			values: { config: undefined, fix: false },
		} as Parameters<typeof lintCommand.run>[0])

		expect(mockExit).not.toHaveBeenCalled()
	})
})
