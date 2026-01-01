import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { parseCommaSeparated } from "../commands/generate.js"

// Mock console.log to suppress output during tests
vi.spyOn(console, "log").mockImplementation(() => {})

// Mock process.exit to prevent test termination
const mockExit = vi.spyOn(process, "exit").mockImplementation((code) => {
	throw new Error(`Process exited with code ${code}`)
})

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

	describe("generateFromRoutesFile", () => {
		const testDir = join(process.cwd(), ".test-generate")
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

		it("should generate screen.meta.ts from Vue Router config", async () => {
			// Create routes file
			const srcDir = join(testDir, "src/router")
			const viewsDir = join(testDir, "src/views")
			mkdirSync(srcDir, { recursive: true })
			mkdirSync(viewsDir, { recursive: true })

			writeFileSync(
				join(srcDir, "routes.ts"),
				`
export const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/Home.vue'),
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('../views/About.vue'),
  },
]
`,
			)

			// Create config with routesFile
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`
import { defineConfig } from "@screenbook/core"
export default defineConfig({
  metaPattern: "src/**/screen.meta.ts",
  routesFile: "src/router/routes.ts",
})
`,
			)

			const { generateCommand } = await import("../commands/generate.js")

			await generateCommand.run({
				values: {
					config: undefined,
					dryRun: false,
					force: false,
					interactive: false,
				},
			} as Parameters<typeof generateCommand.run>[0])

			// Check that screen.meta.ts files were created
			expect(existsSync(join(viewsDir, "screen.meta.ts"))).toBe(true)

			// Verify content includes correct screen ID
			const content = readFileSync(join(viewsDir, "screen.meta.ts"), "utf-8")
			expect(content).toContain('id: "home"')
			expect(content).toContain('route: "/"')
		})

		it("should respect dry-run flag", async () => {
			// Create routes file
			const srcDir = join(testDir, "src/router")
			const viewsDir = join(testDir, "src/views")
			mkdirSync(srcDir, { recursive: true })
			mkdirSync(viewsDir, { recursive: true })

			writeFileSync(
				join(srcDir, "routes.ts"),
				`
export const routes = [
  {
    path: '/users',
    component: () => import('../views/Users.vue'),
  },
]
`,
			)

			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default { outDir: ".screenbook", metaPattern: "src/**/screen.meta.ts", routesFile: "src/router/routes.ts", ignore: [] }`,
			)

			const { generateCommand } = await import("../commands/generate.js")

			await generateCommand.run({
				values: {
					config: undefined,
					dryRun: true,
					force: false,
					interactive: false,
				},
			} as Parameters<typeof generateCommand.run>[0])

			// Files should NOT be created in dry-run mode
			expect(existsSync(join(viewsDir, "screen.meta.ts"))).toBe(false)
		})

		it("should skip existing files without force flag", async () => {
			// Create routes file
			const srcDir = join(testDir, "src/router")
			const viewsDir = join(testDir, "src/views")
			mkdirSync(srcDir, { recursive: true })
			mkdirSync(viewsDir, { recursive: true })

			writeFileSync(
				join(srcDir, "routes.ts"),
				`
export const routes = [
  {
    path: '/dashboard',
    component: () => import('../views/Dashboard.vue'),
  },
]
`,
			)

			// Create existing screen.meta.ts
			writeFileSync(
				join(viewsDir, "screen.meta.ts"),
				'export const screen = { id: "existing" }',
			)

			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default { outDir: ".screenbook", metaPattern: "src/**/screen.meta.ts", routesFile: "src/router/routes.ts", ignore: [] }`,
			)

			const { generateCommand } = await import("../commands/generate.js")

			await generateCommand.run({
				values: {
					config: undefined,
					dryRun: false,
					force: false,
					interactive: false,
				},
			} as Parameters<typeof generateCommand.run>[0])

			// Existing file should not be overwritten
			const content = readFileSync(join(viewsDir, "screen.meta.ts"), "utf-8")
			expect(content).toContain('id: "existing"')
		})

		it("should overwrite existing files with force flag", async () => {
			// Create routes file
			const srcDir = join(testDir, "src/router")
			const viewsDir = join(testDir, "src/views")
			mkdirSync(srcDir, { recursive: true })
			mkdirSync(viewsDir, { recursive: true })

			writeFileSync(
				join(srcDir, "routes.ts"),
				`
export const routes = [
  {
    path: '/profile',
    component: () => import('../views/Profile.vue'),
  },
]
`,
			)

			// Create existing screen.meta.ts
			writeFileSync(
				join(viewsDir, "screen.meta.ts"),
				'export const screen = { id: "old" }',
			)

			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default { outDir: ".screenbook", metaPattern: "src/**/screen.meta.ts", routesFile: "src/router/routes.ts", ignore: [] }`,
			)

			const { generateCommand } = await import("../commands/generate.js")

			await generateCommand.run({
				values: {
					config: undefined,
					dryRun: false,
					force: true,
					interactive: false,
				},
			} as Parameters<typeof generateCommand.run>[0])

			// File should be overwritten
			const content = readFileSync(join(viewsDir, "screen.meta.ts"), "utf-8")
			expect(content).toContain('id: "profile"')
			expect(content).not.toContain('id: "old"')
		})

		it("should exit with error when routes file not found", async () => {
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default { outDir: ".screenbook", metaPattern: "src/**/screen.meta.ts", routesFile: "src/router/nonexistent.ts", ignore: [] }`,
			)

			const { generateCommand } = await import("../commands/generate.js")

			await expect(
				generateCommand.run({
					values: {
						config: undefined,
						dryRun: false,
						force: false,
						interactive: false,
					},
				} as Parameters<typeof generateCommand.run>[0]),
			).rejects.toThrow("Process exited with code 1")
		})

		it("should exit with error when routes file has syntax errors", async () => {
			const srcDir = join(testDir, "src/router")
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
				join(testDir, "screenbook.config.ts"),
				`export default { outDir: ".screenbook", metaPattern: "src/**/screen.meta.ts", routesFile: "src/router/routes.ts", ignore: [] }`,
			)

			const { generateCommand } = await import("../commands/generate.js")

			await expect(
				generateCommand.run({
					values: {
						config: undefined,
						dryRun: false,
						force: false,
						interactive: false,
					},
				} as Parameters<typeof generateCommand.run>[0]),
			).rejects.toThrow("Process exited with code 1")
		})

		it("should handle nested routes", async () => {
			// Create routes file with nested routes
			const srcDir = join(testDir, "src/router")
			const viewsDir = join(testDir, "src/views")
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

			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default { outDir: ".screenbook", metaPattern: "src/**/screen.meta.ts", routesFile: "src/router/routes.ts", ignore: [] }`,
			)

			const { generateCommand } = await import("../commands/generate.js")

			await generateCommand.run({
				values: {
					config: undefined,
					dryRun: false,
					force: false,
					interactive: false,
				},
			} as Parameters<typeof generateCommand.run>[0])

			// Check that screen.meta.ts was created
			expect(existsSync(join(viewsDir, "screen.meta.ts"))).toBe(true)
		})
	})
})
