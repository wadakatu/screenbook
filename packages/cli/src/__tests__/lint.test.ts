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

	it("should exit with error when routesPattern is not configured", async () => {
		const { lintCommand } = await import("../commands/lint.js")

		// Should exit with error when routesPattern is not configured
		await expect(
			lintCommand.run({
				values: { config: undefined },
			} as Parameters<typeof lintCommand.run>[0]),
		).rejects.toThrow("Process exited with code 1")
	})

	it("should pass when all routes have colocated screen.meta.ts", async () => {
		// Create config with routesPattern
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

		// Create route file with colocated screen.meta.ts
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

		const { lintCommand } = await import("../commands/lint.js")

		await lintCommand.run({
			values: { config: undefined },
		} as Parameters<typeof lintCommand.run>[0])

		// Should not exit with error when all routes are covered
		expect(mockExit).not.toHaveBeenCalled()
	})

	it("should fail when routes are missing colocated screen.meta.ts", async () => {
		// Create config with routesPattern
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

		// Create route file without corresponding screen.meta.ts
		const pagesDir = join(testDir, "src/pages/about")
		mkdirSync(pagesDir, { recursive: true })
		writeFileSync(
			join(pagesDir, "page.tsx"),
			"export default function About() {}",
		)

		const { lintCommand } = await import("../commands/lint.js")

		await expect(
			lintCommand.run({
				values: { config: undefined },
			} as Parameters<typeof lintCommand.run>[0]),
		).rejects.toThrow("Process exited with code 1")
	})

	it("should return early when no route files found", async () => {
		// Create config with routesPattern pointing to non-existent directory
		writeFileSync(
			join(testDir, "screenbook.config.ts"),
			`export default { outDir: ".screenbook", metaPattern: "src/**/screen.meta.ts", routesPattern: "src/nonexistent/**/page.tsx", ignore: [] }`,
		)

		const { lintCommand } = await import("../commands/lint.js")

		// Should not fail when no routes are found
		await lintCommand.run({
			values: { config: undefined },
		} as Parameters<typeof lintCommand.run>[0])

		expect(mockExit).not.toHaveBeenCalled()
	})

	describe("orphan screen warnings", () => {
		it("should show tip instead of warnings when all screens are orphans", async () => {
			const orphanTestDir = join(testDir, "orphan-all")
			mkdirSync(orphanTestDir, { recursive: true })
			process.chdir(orphanTestDir)

			// Create config
			writeFileSync(
				join(orphanTestDir, "screenbook.config.ts"),
				`export default { outDir: ".screenbook", metaPattern: "src/**/*.screen.meta.ts", routesPattern: "src/**/*.tsx" }`,
			)

			// Create dummy route files
			mkdirSync(join(orphanTestDir, "src"), { recursive: true })
			writeFileSync(join(orphanTestDir, "src/home.tsx"), "// home")
			writeFileSync(join(orphanTestDir, "src/about.tsx"), "// about")

			// Create screen.meta.ts files
			writeFileSync(
				join(orphanTestDir, "src/home.screen.meta.ts"),
				'import { defineScreen } from "screenbook"; export const screen = defineScreen({ id: "home", title: "Home", route: "/", entryPoints: [], next: [] });',
			)
			writeFileSync(
				join(orphanTestDir, "src/about.screen.meta.ts"),
				'import { defineScreen } from "screenbook"; export const screen = defineScreen({ id: "about", title: "About", route: "/about", entryPoints: [], next: [] });',
			)

			// Create .screenbook directory and screens.json with all orphan screens
			mkdirSync(join(orphanTestDir, ".screenbook"), { recursive: true })
			const allOrphanScreens = [
				{
					id: "home",
					title: "Home",
					route: "/",
					entryPoints: [],
					next: [],
				},
				{
					id: "about",
					title: "About",
					route: "/about",
					entryPoints: [],
					next: [],
				},
			]
			writeFileSync(
				join(orphanTestDir, ".screenbook", "screens.json"),
				JSON.stringify(allOrphanScreens, null, 2),
			)

			// Restore console.log mock to capture output
			vi.mocked(console.log).mockRestore()
			const consoleLogSpy = vi.spyOn(console, "log")

			const { lintCommand } = await import("../commands/lint.js")

			await lintCommand.run({
				values: { config: undefined, allowCycles: false, strict: false },
			} as Parameters<typeof lintCommand.run>[0])

			// Should show tip, not warning
			const logCalls = consoleLogSpy.mock.calls.map((call) => call[0])
			const hasOrphanWarning = logCalls.some((msg) =>
				msg?.includes?.("Orphan screens detected"),
			)
			const hasTip = logCalls.some((msg) =>
				msg?.includes?.("Tip: All screens are currently disconnected"),
			)

			expect(hasOrphanWarning).toBe(false)
			expect(hasTip).toBe(true)
			expect(mockExit).not.toHaveBeenCalled()
		})

		it("should show warnings when some (not all) screens are orphans", async () => {
			const orphanTestDir = join(testDir, "orphan-some")
			mkdirSync(orphanTestDir, { recursive: true })
			process.chdir(orphanTestDir)

			// Create config
			writeFileSync(
				join(orphanTestDir, "screenbook.config.ts"),
				`export default { outDir: ".screenbook", metaPattern: "src/**/*.screen.meta.ts", routesPattern: "src/**/*.tsx" }`,
			)

			// Create dummy route files
			mkdirSync(join(orphanTestDir, "src"), { recursive: true })
			writeFileSync(join(orphanTestDir, "src/home.tsx"), "// home")
			writeFileSync(join(orphanTestDir, "src/about.tsx"), "// about")
			writeFileSync(join(orphanTestDir, "src/contact.tsx"), "// contact")

			// Create screen.meta.ts files
			writeFileSync(
				join(orphanTestDir, "src/home.screen.meta.ts"),
				'import { defineScreen } from "screenbook"; export const screen = defineScreen({ id: "home", title: "Home", route: "/", entryPoints: ["direct"], next: ["about"] });',
			)
			writeFileSync(
				join(orphanTestDir, "src/about.screen.meta.ts"),
				'import { defineScreen } from "screenbook"; export const screen = defineScreen({ id: "about", title: "About", route: "/about", entryPoints: [], next: [] });',
			)
			writeFileSync(
				join(orphanTestDir, "src/contact.screen.meta.ts"),
				'import { defineScreen } from "screenbook"; export const screen = defineScreen({ id: "contact", title: "Contact", route: "/contact", entryPoints: [], next: [] });',
			)

			// Create .screenbook directory and screens.json with mixed connected/orphan screens
			mkdirSync(join(orphanTestDir, ".screenbook"), { recursive: true })
			const mixedScreens = [
				{
					id: "home",
					title: "Home",
					route: "/",
					entryPoints: ["direct"],
					next: ["about"],
				},
				{
					id: "about",
					title: "About",
					route: "/about",
					entryPoints: [],
					next: [],
				},
				{
					id: "contact",
					title: "Contact",
					route: "/contact",
					entryPoints: [],
					next: [],
				},
			]
			writeFileSync(
				join(orphanTestDir, ".screenbook", "screens.json"),
				JSON.stringify(mixedScreens, null, 2),
			)

			// Restore console.log mock to capture output
			vi.mocked(console.log).mockRestore()
			const consoleLogSpy = vi.spyOn(console, "log")

			const { lintCommand } = await import("../commands/lint.js")

			await lintCommand.run({
				values: { config: undefined, allowCycles: false, strict: false },
			} as Parameters<typeof lintCommand.run>[0])

			// Should show warnings for orphan screens (contact is orphan, about is referenced in home's next)
			const logCalls = consoleLogSpy.mock.calls.map((call) => call[0])
			const hasOrphanWarning = logCalls.some((msg) =>
				msg?.includes?.("Orphan screens detected (1)"),
			)

			expect(hasOrphanWarning).toBe(true)
			expect(mockExit).not.toHaveBeenCalled()
		})

		it("should suppress orphan warnings when lint.orphans is 'off'", async () => {
			const orphanTestDir = join(testDir, "orphan-off")
			mkdirSync(orphanTestDir, { recursive: true })
			process.chdir(orphanTestDir)

			// Create config with lint.orphans: "off" and adoption: { minimumCoverage: 0 }
			writeFileSync(
				join(orphanTestDir, "screenbook.config.ts"),
				`export default { outDir: ".screenbook", metaPattern: "src/**/*.screen.meta.ts", routesPattern: "src/**/*.tsx", adoption: { minimumCoverage: 0 }, lint: { orphans: "off" } }`,
			)

			// Create dummy route files
			mkdirSync(join(orphanTestDir, "src"), { recursive: true })
			writeFileSync(join(orphanTestDir, "src/home.tsx"), "// home")

			// Create screen.meta.ts files
			writeFileSync(
				join(orphanTestDir, "src/home.screen.meta.ts"),
				'import { defineScreen } from "screenbook"; export const screen = defineScreen({ id: "home", title: "Home", route: "/", entryPoints: [], next: [] });',
			)

			// Create .screenbook directory and screens.json with orphan screens
			mkdirSync(join(orphanTestDir, ".screenbook"), { recursive: true })
			const orphanScreens = [
				{
					id: "home",
					title: "Home",
					route: "/",
					entryPoints: [],
					next: [],
				},
			]
			writeFileSync(
				join(orphanTestDir, ".screenbook", "screens.json"),
				JSON.stringify(orphanScreens, null, 2),
			)

			// Restore console.log mock to capture output
			vi.mocked(console.log).mockRestore()
			const consoleLogSpy = vi.spyOn(console, "log")

			const { lintCommand } = await import("../commands/lint.js")

			await lintCommand.run({
				values: { config: undefined, allowCycles: false, strict: false },
			} as Parameters<typeof lintCommand.run>[0])

			// Should not show any orphan-related output
			const logCalls = consoleLogSpy.mock.calls.map((call) => call[0])
			const hasOrphanWarning = logCalls.some((msg) =>
				msg?.includes?.("Orphan screens detected"),
			)
			const hasTip = logCalls.some((msg) =>
				msg?.includes?.("Tip: All screens are currently disconnected"),
			)

			expect(hasOrphanWarning).toBe(false)
			expect(hasTip).toBe(false)
			expect(mockExit).not.toHaveBeenCalled()
		})

		it("should fail when orphans exist and lint.orphans is 'error'", async () => {
			const orphanTestDir = join(testDir, "orphan-error")
			mkdirSync(orphanTestDir, { recursive: true })
			process.chdir(orphanTestDir)

			// Create config with lint.orphans: "error" and adoption: { minimumCoverage: 0 }
			writeFileSync(
				join(orphanTestDir, "screenbook.config.ts"),
				`export default { outDir: ".screenbook", metaPattern: "src/**/*.screen.meta.ts", routesPattern: "src/**/*.tsx", adoption: { minimumCoverage: 0 }, lint: { orphans: "error" } }`,
			)

			// Create dummy route files
			mkdirSync(join(orphanTestDir, "src"), { recursive: true })
			writeFileSync(join(orphanTestDir, "src/home.tsx"), "// home")
			writeFileSync(join(orphanTestDir, "src/about.tsx"), "// about")

			// Create screen.meta.ts files
			writeFileSync(
				join(orphanTestDir, "src/home.screen.meta.ts"),
				'import { defineScreen } from "screenbook"; export const screen = defineScreen({ id: "home", title: "Home", route: "/", entryPoints: ["direct"], next: [] });',
			)
			writeFileSync(
				join(orphanTestDir, "src/about.screen.meta.ts"),
				'import { defineScreen } from "screenbook"; export const screen = defineScreen({ id: "about", title: "About", route: "/about", entryPoints: [], next: [] });',
			)

			// Create .screenbook directory and screens.json with mixed screens
			mkdirSync(join(orphanTestDir, ".screenbook"), { recursive: true })
			const mixedScreens = [
				{
					id: "home",
					title: "Home",
					route: "/",
					entryPoints: ["direct"],
					next: [],
				},
				{
					id: "about",
					title: "About",
					route: "/about",
					entryPoints: [],
					next: [],
				},
			]
			writeFileSync(
				join(orphanTestDir, ".screenbook", "screens.json"),
				JSON.stringify(mixedScreens, null, 2),
			)

			const { lintCommand } = await import("../commands/lint.js")

			// Should exit with error
			try {
				await lintCommand.run({
					values: { config: undefined, allowCycles: false, strict: false },
				} as Parameters<typeof lintCommand.run>[0])
				// Should not reach here
				expect.fail("Expected process.exit to be called")
			} catch (error) {
				expect(String(error)).toContain("Process exited with code 1")
			}
		})

		it("should fail on all-orphan state when lint.orphans is 'error'", async () => {
			const orphanTestDir = join(testDir, "orphan-error-all")
			mkdirSync(orphanTestDir, { recursive: true })
			process.chdir(orphanTestDir)

			// Create config with lint.orphans: "error" and adoption: { minimumCoverage: 0 }
			writeFileSync(
				join(orphanTestDir, "screenbook.config.ts"),
				`export default { outDir: ".screenbook", metaPattern: "src/**/*.screen.meta.ts", routesPattern: "src/**/*.tsx", adoption: { minimumCoverage: 0 }, lint: { orphans: "error" } }`,
			)

			// Create dummy route files
			mkdirSync(join(orphanTestDir, "src"), { recursive: true })
			writeFileSync(join(orphanTestDir, "src/home.tsx"), "// home")
			writeFileSync(join(orphanTestDir, "src/about.tsx"), "// about")

			// Create screen.meta.ts files
			writeFileSync(
				join(orphanTestDir, "src/home.screen.meta.ts"),
				'import { defineScreen } from "screenbook"; export const screen = defineScreen({ id: "home", title: "Home", route: "/", entryPoints: [], next: [] });',
			)
			writeFileSync(
				join(orphanTestDir, "src/about.screen.meta.ts"),
				'import { defineScreen } from "screenbook"; export const screen = defineScreen({ id: "about", title: "About", route: "/about", entryPoints: [], next: [] });',
			)

			// Create .screenbook directory and screens.json with all orphan screens
			mkdirSync(join(orphanTestDir, ".screenbook"), { recursive: true })
			const allOrphanScreens = [
				{
					id: "home",
					title: "Home",
					route: "/",
					entryPoints: [],
					next: [],
				},
				{
					id: "about",
					title: "About",
					route: "/about",
					entryPoints: [],
					next: [],
				},
			]
			writeFileSync(
				join(orphanTestDir, ".screenbook", "screens.json"),
				JSON.stringify(allOrphanScreens, null, 2),
			)

			const { lintCommand } = await import("../commands/lint.js")

			// Should exit with error even though all screens are orphans
			try {
				await lintCommand.run({
					values: { config: undefined, allowCycles: false, strict: false },
				} as Parameters<typeof lintCommand.run>[0])
				// Should not reach here
				expect.fail("Expected process.exit to be called")
			} catch (error) {
				expect(String(error)).toContain("Process exited with code 1")
			}
		})

		it("should handle empty screens.json gracefully", async () => {
			const orphanTestDir = join(testDir, "empty-screens")
			mkdirSync(orphanTestDir, { recursive: true })
			process.chdir(orphanTestDir)

			// Create config with adoption: { minimumCoverage: 0 }
			writeFileSync(
				join(orphanTestDir, "screenbook.config.ts"),
				`export default { outDir: ".screenbook", metaPattern: "src/**/*.screen.meta.ts", routesPattern: "src/**/*.tsx", adoption: { minimumCoverage: 0 } }`,
			)

			// Create dummy route files
			mkdirSync(join(orphanTestDir, "src"), { recursive: true })
			writeFileSync(join(orphanTestDir, "src/home.tsx"), "// home")

			// Create screen.meta.ts files
			writeFileSync(
				join(orphanTestDir, "src/home.screen.meta.ts"),
				'import { defineScreen } from "screenbook"; export const screen = defineScreen({ id: "home", title: "Home", route: "/", entryPoints: [], next: [] });',
			)

			// Create .screenbook directory and empty screens.json
			mkdirSync(join(orphanTestDir, ".screenbook"), { recursive: true })
			writeFileSync(
				join(orphanTestDir, ".screenbook", "screens.json"),
				JSON.stringify([], null, 2),
			)

			const { lintCommand } = await import("../commands/lint.js")

			// Should not crash or show orphan warnings
			await lintCommand.run({
				values: { config: undefined, allowCycles: false, strict: false },
			} as Parameters<typeof lintCommand.run>[0])

			expect(mockExit).not.toHaveBeenCalled()
		})

		it("should handle malformed screens.json gracefully in error mode", async () => {
			const orphanTestDir = join(testDir, "malformed-json-error")
			mkdirSync(orphanTestDir, { recursive: true })
			process.chdir(orphanTestDir)

			// Create config with lint.orphans: "error" and adoption: { minimumCoverage: 0 }
			writeFileSync(
				join(orphanTestDir, "screenbook.config.ts"),
				`export default { outDir: ".screenbook", metaPattern: "src/**/*.screen.meta.ts", routesPattern: "src/**/*.tsx", adoption: { minimumCoverage: 0 }, lint: { orphans: "error" } }`,
			)

			// Create dummy route files
			mkdirSync(join(orphanTestDir, "src"), { recursive: true })
			writeFileSync(join(orphanTestDir, "src/home.tsx"), "// home")

			// Create screen.meta.ts files
			writeFileSync(
				join(orphanTestDir, "src/home.screen.meta.ts"),
				'import { defineScreen } from "screenbook"; export const screen = defineScreen({ id: "home", title: "Home", route: "/", entryPoints: [], next: [] });',
			)

			// Create .screenbook directory with malformed JSON
			mkdirSync(join(orphanTestDir, ".screenbook"), { recursive: true })
			writeFileSync(
				join(orphanTestDir, ".screenbook", "screens.json"),
				"{invalid json}",
			)

			const { lintCommand } = await import("../commands/lint.js")

			// Should exit with error due to parse error
			try {
				await lintCommand.run({
					values: { config: undefined, allowCycles: false, strict: false },
				} as Parameters<typeof lintCommand.run>[0])
				// Should not reach here
				expect.fail("Expected process.exit to be called")
			} catch (error) {
				expect(String(error)).toContain("Process exited with code 1")
			}
		})

		it("should not fail when screens.json missing even with orphans: error", async () => {
			const orphanTestDir = join(testDir, "missing-screens-json-error")
			mkdirSync(orphanTestDir, { recursive: true })
			process.chdir(orphanTestDir)

			// Create config with lint.orphans: "error" and adoption: { minimumCoverage: 0 }
			writeFileSync(
				join(orphanTestDir, "screenbook.config.ts"),
				`export default { outDir: ".screenbook", metaPattern: "src/**/*.screen.meta.ts", routesPattern: "src/**/*.tsx", adoption: { minimumCoverage: 0 }, lint: { orphans: "error" } }`,
			)

			// Create dummy route files
			mkdirSync(join(orphanTestDir, "src"), { recursive: true })
			writeFileSync(join(orphanTestDir, "src/home.tsx"), "// home")

			// Create screen.meta.ts files
			writeFileSync(
				join(orphanTestDir, "src/home.screen.meta.ts"),
				'import { defineScreen } from "screenbook"; export const screen = defineScreen({ id: "home", title: "Home", route: "/", entryPoints: [], next: [] });',
			)

			// No screens.json created

			const { lintCommand } = await import("../commands/lint.js")

			// Should pass - missing screens.json is not an error
			await lintCommand.run({
				values: { config: undefined, allowCycles: false, strict: false },
			} as Parameters<typeof lintCommand.run>[0])

			expect(mockExit).not.toHaveBeenCalled()
		})
	})

	describe("lintRoutesFile", () => {
		const routesFileTestDir = join(process.cwd(), ".test-lint-routesfile")
		let routesFileOriginalCwd: string

		beforeEach(() => {
			routesFileOriginalCwd = process.cwd()
			if (existsSync(routesFileTestDir)) {
				rmSync(routesFileTestDir, { recursive: true })
			}
			mkdirSync(routesFileTestDir, { recursive: true })
			process.chdir(routesFileTestDir)
			mockExit.mockClear()
		})

		afterEach(() => {
			process.chdir(routesFileOriginalCwd)
			if (existsSync(routesFileTestDir)) {
				rmSync(routesFileTestDir, { recursive: true })
			}
			vi.resetModules()
		})

		it("should pass when all routes have screen.meta.ts (routesFile mode)", async () => {
			// Create config with routesFile first
			writeFileSync(
				join(routesFileTestDir, "screenbook.config.ts"),
				`export default { outDir: ".screenbook", metaPattern: "src/**/screen.meta.ts", routesFile: "src/router/routes.ts", ignore: [] }`,
			)

			// Create routes file
			const srcDir = join(routesFileTestDir, "src/router")
			const viewsDir = join(routesFileTestDir, "src/views")
			mkdirSync(srcDir, { recursive: true })
			mkdirSync(viewsDir, { recursive: true })

			writeFileSync(
				join(srcDir, "routes.ts"),
				`
export const routes = [
  {
    path: '/',
    component: () => import('../views/Home.vue'),
  },
]
`,
			)

			// Create screen.meta.ts next to component
			writeFileSync(
				join(viewsDir, "screen.meta.ts"),
				`export const screen = { id: "home", title: "Home", route: "/" }`,
			)

			const { lintCommand } = await import("../commands/lint.js")

			await lintCommand.run({
				values: { config: undefined, allowCycles: false, strict: false },
			} as Parameters<typeof lintCommand.run>[0])

			expect(mockExit).not.toHaveBeenCalled()
		})

		it("should fail when routes are missing screen.meta.ts (routesFile mode)", async () => {
			// Create config with routesFile first
			writeFileSync(
				join(routesFileTestDir, "screenbook.config.ts"),
				`export default { outDir: ".screenbook", metaPattern: "src/**/screen.meta.ts", routesFile: "src/router/routes.ts", ignore: [] }`,
			)

			// Create routes file
			const srcDir = join(routesFileTestDir, "src/router")
			const viewsDir = join(routesFileTestDir, "src/views")
			mkdirSync(srcDir, { recursive: true })
			mkdirSync(viewsDir, { recursive: true })

			writeFileSync(
				join(srcDir, "routes.ts"),
				`
export const routes = [
  {
    path: '/about',
    component: () => import('../views/About.vue'),
  },
]
`,
			)

			// No screen.meta.ts file created

			const { lintCommand } = await import("../commands/lint.js")

			await expect(
				lintCommand.run({
					values: { config: undefined, allowCycles: false, strict: false },
				} as Parameters<typeof lintCommand.run>[0]),
			).rejects.toThrow("Process exited with code 1")
		})

		it("should exit with error when routes file not found", async () => {
			writeFileSync(
				join(routesFileTestDir, "screenbook.config.ts"),
				`export default { outDir: ".screenbook", metaPattern: "src/**/screen.meta.ts", routesFile: "src/router/nonexistent.ts", ignore: [] }`,
			)

			const { lintCommand } = await import("../commands/lint.js")

			await expect(
				lintCommand.run({
					values: { config: undefined, allowCycles: false, strict: false },
				} as Parameters<typeof lintCommand.run>[0]),
			).rejects.toThrow("Process exited with code 1")
		})

		it("should exit with error when routes file has syntax errors", async () => {
			const srcDir = join(routesFileTestDir, "src/router")
			mkdirSync(srcDir, { recursive: true })

			// Create routes file with syntax error
			writeFileSync(
				join(srcDir, "routes.ts"),
				`
export const routes = [
  {
    path: '/home'
    // Missing comma - syntax error
    component: () => import('./Home.vue')
  }
]
`,
			)

			writeFileSync(
				join(routesFileTestDir, "screenbook.config.ts"),
				`export default { outDir: ".screenbook", metaPattern: "src/**/screen.meta.ts", routesFile: "src/router/routes.ts", ignore: [] }`,
			)

			const { lintCommand } = await import("../commands/lint.js")

			await expect(
				lintCommand.run({
					values: { config: undefined, allowCycles: false, strict: false },
				} as Parameters<typeof lintCommand.run>[0]),
			).rejects.toThrow("Process exited with code 1")
		})

		it("should handle nested routes in routesFile mode", async () => {
			// Create config with routesFile first
			writeFileSync(
				join(routesFileTestDir, "screenbook.config.ts"),
				`export default { outDir: ".screenbook", metaPattern: "src/**/screen.meta.ts", routesFile: "src/router/routes.ts", ignore: [] }`,
			)

			// Create routes file with nested routes
			const srcDir = join(routesFileTestDir, "src/router")
			const viewsDir = join(routesFileTestDir, "src/views")
			mkdirSync(srcDir, { recursive: true })
			mkdirSync(viewsDir, { recursive: true })

			writeFileSync(
				join(srcDir, "routes.ts"),
				`
export const routes = [
  {
    path: '/user/:id',
    component: () => import('../views/User.vue'),
    children: [
      {
        path: 'profile',
        component: () => import('../views/UserProfile.vue'),
      },
    ],
  },
]
`,
			)

			// Create screen.meta.ts for all routes
			writeFileSync(
				join(viewsDir, "screen.meta.ts"),
				`export const screen = { id: "user.id", title: "User", route: "/user/:id" }`,
			)

			const { lintCommand } = await import("../commands/lint.js")

			await lintCommand.run({
				values: { config: undefined, allowCycles: false, strict: false },
			} as Parameters<typeof lintCommand.run>[0])

			expect(mockExit).not.toHaveBeenCalled()
		})

		it("should return early when no routes found in config file", async () => {
			const srcDir = join(routesFileTestDir, "src/router")
			mkdirSync(srcDir, { recursive: true })

			// Create empty routes file (no routes array)
			writeFileSync(
				join(srcDir, "routes.ts"),
				`
const someOtherExport = 123
`,
			)

			writeFileSync(
				join(routesFileTestDir, "screenbook.config.ts"),
				`export default { outDir: ".screenbook", metaPattern: "src/**/screen.meta.ts", routesFile: "src/router/routes.ts", ignore: [] }`,
			)

			const { lintCommand } = await import("../commands/lint.js")

			// Should not fail when no routes are found
			await lintCommand.run({
				values: { config: undefined, allowCycles: false, strict: false },
			} as Parameters<typeof lintCommand.run>[0])

			expect(mockExit).not.toHaveBeenCalled()
		})

		// Note: Integration tests for lint.spreadOperator config are covered by unit tests
		// in displayWarnings.test.ts. The config schema correctly parses the lint.spreadOperator
		// option as verified by core/types.test.ts. Integration testing with jiti has caching
		// issues that make these tests flaky.
	})

	describe("excludePatterns", () => {
		it("should exclude files in components directory by default", async () => {
			// Create config with routesPattern
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`
				import { defineConfig } from "@screenbook/core"
				export default defineConfig({
					metaPattern: "src/pages/**/screen.meta.ts",
					routesPattern: "src/pages/**/*.vue",
				})
			`,
			)

			// Create page file (should require screen.meta.ts)
			const pageDir = join(testDir, "src/pages/PageAuth")
			mkdirSync(pageDir, { recursive: true })
			writeFileSync(
				join(pageDir, "PageAuth.vue"),
				"<template><div>Auth</div></template>",
			)
			writeFileSync(
				join(pageDir, "screen.meta.ts"),
				`export const screen = { id: "auth", title: "Auth", route: "/auth" }`,
			)

			// Create component file (should be excluded by default)
			const componentsDir = join(pageDir, "components")
			mkdirSync(componentsDir, { recursive: true })
			writeFileSync(
				join(componentsDir, "AgreeMessage.vue"),
				"<template><div>Component</div></template>",
			)
			// No screen.meta.ts for component - should not cause failure

			const { lintCommand } = await import("../commands/lint.js")

			await lintCommand.run({
				values: { config: undefined },
			} as Parameters<typeof lintCommand.run>[0])

			// Should not fail because components are excluded by default
			expect(mockExit).not.toHaveBeenCalled()
		})

		it("should use custom excludePatterns when provided", async () => {
			// Create config with custom excludePatterns that include widgets
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`
				import { defineConfig } from "@screenbook/core"
				export default defineConfig({
					metaPattern: "src/pages/**/screen.meta.ts",
					routesPattern: "src/pages/**/*.vue",
					excludePatterns: ["**/widgets/**", "**/components/**"],
				})
			`,
			)

			// Create page file
			const pageDir = join(testDir, "src/pages/PageHome")
			mkdirSync(pageDir, { recursive: true })
			writeFileSync(
				join(pageDir, "PageHome.vue"),
				"<template><div>Home</div></template>",
			)
			writeFileSync(
				join(pageDir, "screen.meta.ts"),
				`export const screen = { id: "home", title: "Home", route: "/" }`,
			)

			// Create widget file (should be excluded by custom pattern)
			const widgetsDir = join(pageDir, "widgets")
			mkdirSync(widgetsDir, { recursive: true })
			writeFileSync(
				join(widgetsDir, "Widget.vue"),
				"<template><div>Widget</div></template>",
			)

			// Create component file (also excluded by custom pattern)
			const componentsDir = join(pageDir, "components")
			mkdirSync(componentsDir, { recursive: true })
			writeFileSync(
				join(componentsDir, "Button.vue"),
				"<template><button>Click</button></template>",
			)

			const { lintCommand } = await import("../commands/lint.js")

			// Should pass because both widgets and components are excluded
			await lintCommand.run({
				values: { config: undefined },
			} as Parameters<typeof lintCommand.run>[0])

			expect(mockExit).not.toHaveBeenCalled()
		})

		it("should exclude files in multiple default directories", async () => {
			// Create config with routesPattern (no custom excludePatterns)
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`
				import { defineConfig } from "@screenbook/core"
				export default defineConfig({
					metaPattern: "src/pages/**/screen.meta.ts",
					routesPattern: "src/pages/**/*.vue",
				})
			`,
			)

			// Create page file
			const pageDir = join(testDir, "src/pages/PageSettings")
			mkdirSync(pageDir, { recursive: true })
			writeFileSync(
				join(pageDir, "PageSettings.vue"),
				"<template><div>Settings</div></template>",
			)
			writeFileSync(
				join(pageDir, "screen.meta.ts"),
				`export const screen = { id: "settings", title: "Settings", route: "/settings" }`,
			)

			// Create files in various directories that should be excluded by default
			const dirsToExclude = ["components", "hooks", "utils", "shared"]
			for (const dir of dirsToExclude) {
				const excludedDir = join(pageDir, dir)
				mkdirSync(excludedDir, { recursive: true })
				writeFileSync(
					join(excludedDir, "SomeFile.vue"),
					"<template><div>Excluded</div></template>",
				)
			}

			const { lintCommand } = await import("../commands/lint.js")

			// Should pass because all excluded directories are filtered out
			await lintCommand.run({
				values: { config: undefined },
			} as Parameters<typeof lintCommand.run>[0])

			expect(mockExit).not.toHaveBeenCalled()
		})

		it("should apply excludePatterns in routesFile mode", async () => {
			// Create Vue Router config with routes pointing to component directories
			const routerDir = join(testDir, "src/router")
			mkdirSync(routerDir, { recursive: true })
			writeFileSync(
				join(routerDir, "index.ts"),
				`
				import { createRouter, createWebHistory } from "vue-router"

				const routes = [
					{
						path: "/home",
						name: "home",
						component: () => import("@/pages/Home/HomePage.vue"),
					},
					{
						path: "/button",
						name: "button",
						component: () => import("@/components/Button/Button.vue"),
					},
				]

				export default createRouter({
					history: createWebHistory(),
					routes,
				})
			`,
			)

			// Create screenbook config with routesFile
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`
				import { defineConfig } from "@screenbook/core"
				export default defineConfig({
					metaPattern: "src/pages/**/screen.meta.ts",
					routesFile: "src/router/index.ts",
				})
			`,
			)

			// Create page directory with screen.meta.ts
			const pageDir = join(testDir, "src/pages/Home")
			mkdirSync(pageDir, { recursive: true })
			writeFileSync(
				join(pageDir, "HomePage.vue"),
				"<template><div>Home</div></template>",
			)
			writeFileSync(
				join(pageDir, "screen.meta.ts"),
				`export const screen = { id: "home", title: "Home", route: "/home" }`,
			)

			// Create component directory WITHOUT screen.meta.ts
			// This should be excluded by default excludePatterns
			const componentDir = join(testDir, "src/components/Button")
			mkdirSync(componentDir, { recursive: true })
			writeFileSync(
				join(componentDir, "Button.vue"),
				"<template><button>Click</button></template>",
			)
			// No screen.meta.ts - should NOT cause failure because components/ is excluded

			const { lintCommand } = await import("../commands/lint.js")

			// Should pass because components directory is excluded
			await lintCommand.run({
				values: { config: undefined },
			} as Parameters<typeof lintCommand.run>[0])

			expect(mockExit).not.toHaveBeenCalled()
		})

		it("should use custom excludePatterns in routesFile mode", async () => {
			// Create Vue Router config with routes pointing to internal directory
			const routerDir = join(testDir, "src/router")
			mkdirSync(routerDir, { recursive: true })
			writeFileSync(
				join(routerDir, "index.ts"),
				`
				import { createRouter, createWebHistory } from "vue-router"

				const routes = [
					{
						path: "/dashboard",
						name: "dashboard",
						component: () => import("@/pages/Dashboard/DashboardPage.vue"),
					},
					{
						path: "/admin",
						name: "admin",
						component: () => import("@/internal/Admin/AdminPage.vue"),
					},
				]

				export default createRouter({
					history: createWebHistory(),
					routes,
				})
			`,
			)

			// Create screenbook config with routesFile and custom excludePatterns
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`
				import { defineConfig } from "@screenbook/core"
				export default defineConfig({
					metaPattern: "src/pages/**/screen.meta.ts",
					routesFile: "src/router/index.ts",
					excludePatterns: ["**/internal/**"],
				})
			`,
			)

			// Create page directory with screen.meta.ts
			const pageDir = join(testDir, "src/pages/Dashboard")
			mkdirSync(pageDir, { recursive: true })
			writeFileSync(
				join(pageDir, "DashboardPage.vue"),
				"<template><div>Dashboard</div></template>",
			)
			writeFileSync(
				join(pageDir, "screen.meta.ts"),
				`export const screen = { id: "dashboard", title: "Dashboard", route: "/dashboard" }`,
			)

			// Create internal directory WITHOUT screen.meta.ts
			// This should be excluded by custom excludePatterns
			const internalDir = join(testDir, "src/internal/Admin")
			mkdirSync(internalDir, { recursive: true })
			writeFileSync(
				join(internalDir, "AdminPage.vue"),
				"<template><div>Admin</div></template>",
			)
			// No screen.meta.ts - should NOT cause failure because internal/ is excluded

			const { lintCommand } = await import("../commands/lint.js")

			// Should pass because internal directory is excluded by custom pattern
			await lintCommand.run({
				values: { config: undefined },
			} as Parameters<typeof lintCommand.run>[0])

			expect(mockExit).not.toHaveBeenCalled()
		})
	})
})
