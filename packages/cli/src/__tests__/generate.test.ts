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
import { DEFAULT_EXCLUDE_PATTERNS } from "../utils/constants.js"

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

		it("should fail when --detect-api used without apiIntegration config", async () => {
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
]
`,
			)

			writeFileSync(
				join(viewsDir, "Home.vue"),
				"<template><div>Home</div></template>",
			)

			// Config WITHOUT apiIntegration
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
						detectApi: true,
					},
				} as Parameters<typeof generateCommand.run>[0]),
			).rejects.toThrow("Process exited with code 1")
		})

		it("should detect API dependencies when --detect-api is enabled", async () => {
			// Reset modules to ensure fresh config loading
			vi.resetModules()

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
    name: 'users',
    component: () => import('../views/Users.tsx'),
  },
]
`,
			)

			// Component file with API imports (use .tsx format for Babel parsing)
			writeFileSync(
				join(viewsDir, "Users.tsx"),
				`import { getUsers, createUser } from "@api/client"

export function Users() {
  const users = getUsers()
  return <div>{users.length}</div>
}`,
			)

			// Config WITH apiIntegration - use unique filename to avoid jiti cache
			const configPath = join(testDir, "api-detect.config.ts")
			writeFileSync(
				configPath,
				`export default {
  outDir: ".screenbook",
  metaPattern: "src/**/screen.meta.ts",
  routesFile: "src/router/routes.ts",
  ignore: [],
  apiIntegration: {
    clientPackages: ["@api/client"],
  },
}`,
			)

			const { generateCommand } = await import("../commands/generate.js")

			await generateCommand.run({
				values: {
					config: configPath,
					dryRun: false,
					force: false,
					interactive: false,
					detectApi: true,
				},
			} as Parameters<typeof generateCommand.run>[0])

			// Check that screen.meta.ts was created with dependsOn
			const metaPath = join(viewsDir, "screen.meta.ts")
			expect(existsSync(metaPath)).toBe(true)

			const content = readFileSync(metaPath, "utf-8")
			expect(content).toContain("dependsOn")
			expect(content).toContain("@api/client/getUsers")
			expect(content).toContain("@api/client/createUser")
		})

		it("should detect navigation targets when --detect-navigation is enabled", async () => {
			// Reset modules to ensure fresh config loading
			vi.resetModules()

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
    name: 'dashboard',
    component: () => import('../views/Dashboard.tsx'),
  },
]
`,
			)

			// Component file with navigation
			writeFileSync(
				join(viewsDir, "Dashboard.tsx"),
				`import Link from "next/link"
import { useRouter } from "next/navigation"

export function Dashboard() {
  const router = useRouter()
  return (
    <div>
      <Link href="/users">Users</Link>
      <Link href="/settings">Settings</Link>
      <button onClick={() => router.push("/profile")}>Profile</button>
    </div>
  )
}`,
			)

			// Config file
			const configPath = join(testDir, "nav-detect.config.ts")
			writeFileSync(
				configPath,
				`export default {
  outDir: ".screenbook",
  metaPattern: "src/**/screen.meta.ts",
  routesFile: "src/router/routes.ts",
  ignore: [],
}`,
			)

			const { generateCommand } = await import("../commands/generate.js")

			await generateCommand.run({
				values: {
					config: configPath,
					dryRun: false,
					force: false,
					interactive: false,
					detectNavigation: true,
				},
			} as Parameters<typeof generateCommand.run>[0])

			// Check that screen.meta.ts was created with next
			const metaPath = join(viewsDir, "screen.meta.ts")
			expect(existsSync(metaPath)).toBe(true)

			const content = readFileSync(metaPath, "utf-8")
			expect(content).toContain("next:")
			expect(content).toContain('"users"')
			expect(content).toContain('"settings"')
			expect(content).toContain('"profile"')
		})
	})

	describe("generateFromRoutesPattern with Vue Router auto-detection", () => {
		const testDir = join(process.cwd(), ".test-generate-vue")
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

		it("should use routes from Vue Router config when using routesPattern", async () => {
			// Create Vue Router config file
			const routerDir = join(testDir, "src/router")
			const pagesDir = join(testDir, "src/pages/PageProjects")
			mkdirSync(routerDir, { recursive: true })
			mkdirSync(pagesDir, { recursive: true })

			// Vue Router configuration with actual route paths
			writeFileSync(
				join(routerDir, "routes.ts"),
				`
export const routes = [
  {
    path: "/projects",
    component: () => import("../pages/PageProjects/index.vue"),
  },
]
`,
			)

			// Create the Vue component
			writeFileSync(
				join(pagesDir, "index.vue"),
				"<template><div>Projects</div></template>",
			)

			// Config using routesPattern (file-based routing pattern)
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default {
  outDir: ".screenbook",
  metaPattern: "src/**/screen.meta.ts",
  routesPattern: "src/pages/**/*.vue",
  ignore: [],
}`,
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

			// Check that screen.meta.ts was created with correct route
			const metaPath = join(pagesDir, "screen.meta.ts")
			expect(existsSync(metaPath)).toBe(true)

			const content = readFileSync(metaPath, "utf-8")
			// Should use "/projects" from Vue Router config, not "/PageProjects" from directory name
			expect(content).toContain('route: "/projects"')
			expect(content).not.toContain('route: "/PageProjects"')
		})

		it("should match routes when component is in subdirectory of page directory", async () => {
			// Create Vue Router config file
			const routerDir = join(testDir, "src/router")
			const pagesDir = join(testDir, "src/pages/PageAdmin")
			const componentsDir = join(testDir, "src/pages/PageAdmin/components")
			mkdirSync(routerDir, { recursive: true })
			mkdirSync(componentsDir, { recursive: true })

			// Vue Router config with component in subdirectory
			writeFileSync(
				join(routerDir, "routes.ts"),
				`
export const routes = [
  {
    path: "/admin",
    component: () => import("../pages/PageAdmin/components/AdminLayout.vue"),
  },
]
`,
			)

			// Create the Vue component in subdirectory
			writeFileSync(
				join(componentsDir, "AdminLayout.vue"),
				"<template><div>Admin Layout</div></template>",
			)

			// Create the page index file (this is what routesPattern scans)
			writeFileSync(
				join(pagesDir, "index.vue"),
				"<template><div>Admin Page</div></template>",
			)

			// Config using routesPattern with ignore for components
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default {
  outDir: ".screenbook",
  metaPattern: "src/**/screen.meta.ts",
  routesPattern: "src/pages/**/index.vue",
  ignore: [],
}`,
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

			// Check that screen.meta.ts was created with correct route from Vue Router
			const metaPath = join(pagesDir, "screen.meta.ts")
			expect(existsSync(metaPath)).toBe(true)

			const content = readFileSync(metaPath, "utf-8")
			// Should use "/admin" from Vue Router config, not "/PageAdmin" from directory name
			expect(content).toContain('route: "/admin"')
			expect(content).not.toContain('route: "/PageAdmin"')
		})

		it("should fall back to path-based inference when Vue Router config not found", async () => {
			// Create only the page file, no router config
			const pagesDir = join(testDir, "src/pages/dashboard")
			mkdirSync(pagesDir, { recursive: true })

			writeFileSync(
				join(pagesDir, "index.vue"),
				"<template><div>Dashboard</div></template>",
			)

			// Config using routesPattern without Vue Router config
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default {
  outDir: ".screenbook",
  metaPattern: "src/**/screen.meta.ts",
  routesPattern: "src/pages/**/*.vue",
  ignore: [],
}`,
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

			// Check that screen.meta.ts was created with inferred route
			const metaPath = join(pagesDir, "screen.meta.ts")
			expect(existsSync(metaPath)).toBe(true)

			const content = readFileSync(metaPath, "utf-8")
			// Should fall back to path-based inference
			expect(content).toContain('route: "/dashboard"')
		})

		it("should handle nested routes from Vue Router config", async () => {
			// Create Vue Router config file with nested routes
			const routerDir = join(testDir, "src/router")
			const userDir = join(testDir, "src/pages/UserLayout")
			const profileDir = join(testDir, "src/pages/UserProfile")
			mkdirSync(routerDir, { recursive: true })
			mkdirSync(userDir, { recursive: true })
			mkdirSync(profileDir, { recursive: true })

			writeFileSync(
				join(routerDir, "routes.ts"),
				`
export const routes = [
  {
    path: "/user/:id",
    component: () => import("../pages/UserLayout/index.vue"),
    children: [
      {
        path: "profile",
        component: () => import("../pages/UserProfile/index.vue"),
      },
    ],
  },
]
`,
			)

			writeFileSync(
				join(userDir, "index.vue"),
				"<template><div>User</div></template>",
			)
			writeFileSync(
				join(profileDir, "index.vue"),
				"<template><div>Profile</div></template>",
			)

			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default {
  outDir: ".screenbook",
  metaPattern: "src/**/screen.meta.ts",
  routesPattern: "src/pages/**/*.vue",
  ignore: [],
}`,
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

			// Check UserProfile gets the nested path
			const profileMetaPath = join(profileDir, "screen.meta.ts")
			expect(existsSync(profileMetaPath)).toBe(true)

			const profileContent = readFileSync(profileMetaPath, "utf-8")
			expect(profileContent).toContain('route: "/user/:id/profile"')
		})
	})

	describe("DEFAULT_EXCLUDE_PATTERNS", () => {
		it("should contain common component directory patterns", () => {
			expect(DEFAULT_EXCLUDE_PATTERNS).toContain("**/components/**")
			expect(DEFAULT_EXCLUDE_PATTERNS).toContain("**/shared/**")
			expect(DEFAULT_EXCLUDE_PATTERNS).toContain("**/utils/**")
			expect(DEFAULT_EXCLUDE_PATTERNS).toContain("**/hooks/**")
			expect(DEFAULT_EXCLUDE_PATTERNS).toContain("**/composables/**")
			expect(DEFAULT_EXCLUDE_PATTERNS).toContain("**/stores/**")
			expect(DEFAULT_EXCLUDE_PATTERNS).toContain("**/services/**")
		})
	})

	describe("exclude patterns integration (issue #170)", () => {
		const testDir = join(process.cwd(), ".test-exclude-patterns")
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

		it("should NOT generate screen.meta.ts in components directories (routesPattern mode)", async () => {
			// Create page and component Vue files
			const pagesDir = join(testDir, "src/pages/PageAdmin")
			const componentsDir = join(pagesDir, "components")
			mkdirSync(componentsDir, { recursive: true })

			// Main page file (should generate screen.meta.ts)
			writeFileSync(
				join(pagesDir, "index.vue"),
				"<template><div>Admin</div></template>",
			)

			// Component file (should NOT generate screen.meta.ts)
			writeFileSync(
				join(componentsDir, "AdminHeader.vue"),
				"<template><header>Admin Header</header></template>",
			)

			// Config using routesPattern
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default {
  outDir: ".screenbook",
  metaPattern: "src/**/screen.meta.ts",
  routesPattern: "src/pages/**/*.vue",
  ignore: [],
}`,
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

			// Main page should have screen.meta.ts
			expect(existsSync(join(pagesDir, "screen.meta.ts"))).toBe(true)

			// Components directory should NOT have screen.meta.ts
			expect(existsSync(join(componentsDir, "screen.meta.ts"))).toBe(false)
		})

		it("should NOT generate screen.meta.ts in nested components directories", async () => {
			// Create nested component structure like in issue #170
			const pagesDir = join(testDir, "src/pages/PageProjectsEditor")
			const componentsDir = join(pagesDir, "components")
			const leftPaneDir = join(componentsDir, "LeftPane")
			const viewsDir = join(leftPaneDir, "views")
			mkdirSync(viewsDir, { recursive: true })

			writeFileSync(
				join(pagesDir, "index.vue"),
				"<template><div>Projects Editor</div></template>",
			)
			writeFileSync(
				join(componentsDir, "Editor.vue"),
				"<template><div>Editor</div></template>",
			)
			writeFileSync(
				join(leftPaneDir, "LeftPane.vue"),
				"<template><div>Left Pane</div></template>",
			)
			writeFileSync(
				join(viewsDir, "TreeView.vue"),
				"<template><div>Tree View</div></template>",
			)

			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default {
  outDir: ".screenbook",
  metaPattern: "src/**/screen.meta.ts",
  routesPattern: "src/pages/**/*.vue",
  ignore: [],
}`,
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

			// Main page should have screen.meta.ts
			expect(existsSync(join(pagesDir, "screen.meta.ts"))).toBe(true)

			// All components directories should NOT have screen.meta.ts
			expect(existsSync(join(componentsDir, "screen.meta.ts"))).toBe(false)
			expect(existsSync(join(leftPaneDir, "screen.meta.ts"))).toBe(false)
			expect(existsSync(join(viewsDir, "screen.meta.ts"))).toBe(false)
		})

		it("should NOT generate screen.meta.ts in other excluded directories", async () => {
			// Test other excluded patterns: hooks, composables, utils, etc.
			const pagesDir = join(testDir, "src/pages/Dashboard")
			const hooksDir = join(pagesDir, "hooks")
			const composablesDir = join(pagesDir, "composables")
			const utilsDir = join(pagesDir, "utils")
			mkdirSync(hooksDir, { recursive: true })
			mkdirSync(composablesDir, { recursive: true })
			mkdirSync(utilsDir, { recursive: true })

			writeFileSync(
				join(pagesDir, "index.vue"),
				"<template><div>Dashboard</div></template>",
			)
			writeFileSync(
				join(hooksDir, "useDashboard.ts"),
				"export function useDashboard() {}",
			)
			writeFileSync(
				join(composablesDir, "useData.ts"),
				"export function useData() {}",
			)
			writeFileSync(join(utilsDir, "helpers.ts"), "export function helper() {}")

			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default {
  outDir: ".screenbook",
  metaPattern: "src/**/screen.meta.ts",
  routesPattern: "src/pages/**/*.{vue,ts}",
  ignore: [],
}`,
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

			// Main page should have screen.meta.ts
			expect(existsSync(join(pagesDir, "screen.meta.ts"))).toBe(true)

			// Excluded directories should NOT have screen.meta.ts
			expect(existsSync(join(hooksDir, "screen.meta.ts"))).toBe(false)
			expect(existsSync(join(composablesDir, "screen.meta.ts"))).toBe(false)
			expect(existsSync(join(utilsDir, "screen.meta.ts"))).toBe(false)
		})

		it("should NOT generate screen.meta.ts for components in routesFile mode", async () => {
			// Create routes file with component in a components directory
			const srcDir = join(testDir, "src/router")
			const viewsDir = join(testDir, "src/views")
			const componentsDir = join(viewsDir, "components")
			mkdirSync(srcDir, { recursive: true })
			mkdirSync(viewsDir, { recursive: true })
			mkdirSync(componentsDir, { recursive: true })

			// Routes file with only a component in components directory
			writeFileSync(
				join(srcDir, "routes.ts"),
				`
export const routes = [
  {
    path: '/header',
    name: 'header',
    component: () => import('../views/components/Header.vue'),
  },
]
`,
			)

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

			// Components directory should NOT have screen.meta.ts
			// because it matches the exclude pattern **/components/**
			expect(existsSync(join(componentsDir, "screen.meta.ts"))).toBe(false)
		})
	})
})
