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
	})
})
