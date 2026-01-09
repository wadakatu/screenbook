import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
	flattenRoutes,
	parseVueRouterConfig,
	pathToScreenId,
	pathToScreenTitle,
} from "../utils/vueRouterParser.js"

describe("vueRouterParser", () => {
	const testDir = join(process.cwd(), ".test-vue-router-parser")

	beforeEach(() => {
		mkdirSync(testDir, { recursive: true })
	})

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true })
	})

	describe("parseVueRouterConfig", () => {
		it("should parse export const routes = [...]", () => {
			const routesFile = join(testDir, "routes.ts")
			writeFileSync(
				routesFile,
				`
import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('./views/Home.vue'),
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('./views/About.vue'),
  },
]
`,
			)

			const result = parseVueRouterConfig(routesFile)

			expect(result.routes).toHaveLength(2)
			expect(result.routes[0]?.path).toBe("/")
			expect(result.routes[0]?.name).toBe("home")
			expect(result.routes[1]?.path).toBe("/about")
			expect(result.routes[1]?.name).toBe("about")
		})

		it("should parse export default [...]", () => {
			const routesFile = join(testDir, "routes.ts")
			writeFileSync(
				routesFile,
				`
export default [
  {
    path: '/users',
    name: 'users',
    component: () => import('./views/Users.vue'),
  },
]
`,
			)

			const result = parseVueRouterConfig(routesFile)

			expect(result.routes).toHaveLength(1)
			expect(result.routes[0]?.path).toBe("/users")
			expect(result.routes[0]?.name).toBe("users")
		})

		it("should parse export default [...] satisfies RouteRecordRaw[]", () => {
			const routesFile = join(testDir, "routes.ts")
			writeFileSync(
				routesFile,
				`
import type { RouteRecordRaw } from 'vue-router'

export default [
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('./views/Dashboard.vue'),
  },
] satisfies RouteRecordRaw[]
`,
			)

			const result = parseVueRouterConfig(routesFile)

			expect(result.routes).toHaveLength(1)
			expect(result.routes[0]?.path).toBe("/dashboard")
		})

		it("should parse nested routes with children", () => {
			const routesFile = join(testDir, "routes.ts")
			writeFileSync(
				routesFile,
				`
export const routes = [
  {
    path: '/user/:id',
    name: 'user',
    component: () => import('./views/User.vue'),
    children: [
      {
        path: 'profile',
        name: 'user-profile',
        component: () => import('./views/UserProfile.vue'),
      },
      {
        path: 'settings',
        name: 'user-settings',
        component: () => import('./views/UserSettings.vue'),
      },
    ],
  },
]
`,
			)

			const result = parseVueRouterConfig(routesFile)

			expect(result.routes).toHaveLength(1)
			expect(result.routes[0]?.path).toBe("/user/:id")
			expect(result.routes[0]?.children).toHaveLength(2)
			expect(result.routes[0]?.children?.[0]?.path).toBe("profile")
			expect(result.routes[0]?.children?.[1]?.path).toBe("settings")
		})

		it("should handle redirect routes", () => {
			const routesFile = join(testDir, "routes.ts")
			writeFileSync(
				routesFile,
				`
export const routes = [
  {
    path: '/old-path',
    redirect: '/new-path',
  },
  {
    path: '/new-path',
    name: 'new-path',
    component: () => import('./views/NewPath.vue'),
  },
]
`,
			)

			const result = parseVueRouterConfig(routesFile)

			expect(result.routes).toHaveLength(2)
			expect(result.routes[0]?.redirect).toBe("/new-path")
			expect(result.routes[1]?.path).toBe("/new-path")
		})

		it("should warn on spread operator", () => {
			const routesFile = join(testDir, "routes.ts")
			writeFileSync(
				routesFile,
				`
const dynamicRoutes = []

export const routes = [
  {
    path: '/',
    component: () => import('./views/Home.vue'),
  },
  ...dynamicRoutes,
]
`,
			)

			const result = parseVueRouterConfig(routesFile)

			expect(result.routes).toHaveLength(1)
			expect(result.warnings).toHaveLength(1)
			expect(result.warnings[0]?.type).toBe("spread")
			expect(result.warnings[0]?.message).toContain("Spread operator")
		})

		it("should extract component path from dynamic import", () => {
			const routesFile = join(testDir, "routes.ts")
			writeFileSync(
				routesFile,
				`
export const routes = [
  {
    path: '/about',
    component: () => import('./views/About.vue'),
  },
]
`,
			)

			const result = parseVueRouterConfig(routesFile)

			expect(result.routes[0]?.component).toContain("views/About.vue")
		})

		it("should resolve component identifier from imports", () => {
			const routesFile = join(testDir, "routes.ts")
			writeFileSync(
				routesFile,
				`
import PageProjects from './pages/PageProjects/PageProjects.vue'
import { PageSettings } from './pages/PageSettings/PageSettings.vue'

export const routes = [
  {
    path: '/projects',
    name: 'PageProjects',
    component: PageProjects,
  },
  {
    path: '/settings',
    name: 'PageSettings',
    component: PageSettings,
  },
]
`,
			)

			const result = parseVueRouterConfig(routesFile)

			expect(result.routes).toHaveLength(2)
			expect(result.routes[0]?.component).toContain(
				"pages/PageProjects/PageProjects.vue",
			)
			expect(result.routes[1]?.component).toContain(
				"pages/PageSettings/PageSettings.vue",
			)
		})

		it("should resolve component identifiers in nested routes", () => {
			const routesFile = join(testDir, "routes.ts")
			writeFileSync(
				routesFile,
				`
import LayoutEditor from './layouts/LayoutEditor.vue'
import PageProjects from './pages/PageProjects/PageProjects.vue'

export const routes = [
  {
    path: '/projects',
    component: LayoutEditor,
    children: [
      {
        path: '',
        name: 'PageProjects',
        component: PageProjects,
      },
    ],
  },
]
`,
			)

			const result = parseVueRouterConfig(routesFile)

			expect(result.routes).toHaveLength(1)
			expect(result.routes[0]?.component).toContain("layouts/LayoutEditor.vue")
			expect(result.routes[0]?.children).toHaveLength(1)
			expect(result.routes[0]?.children?.[0]?.component).toContain(
				"pages/PageProjects/PageProjects.vue",
			)
		})

		it("should throw error when file does not exist", () => {
			const nonExistentFile = join(testDir, "non-existent.ts")

			expect(() => parseVueRouterConfig(nonExistentFile)).toThrow(
				/Failed to read routes file/,
			)
		})

		it("should throw error on syntax errors", () => {
			const routesFile = join(testDir, "invalid.ts")
			writeFileSync(
				routesFile,
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

			expect(() => parseVueRouterConfig(routesFile)).toThrow(
				/Syntax error in routes file/,
			)
		})

		it("should warn when no routes are found", () => {
			const routesFile = join(testDir, "empty.ts")
			writeFileSync(
				routesFile,
				`
// File with no routes
const someOtherExport = 123
`,
			)

			const result = parseVueRouterConfig(routesFile)

			expect(result.routes).toHaveLength(0)
			expect(result.warnings).toHaveLength(1)
			expect(result.warnings[0]?.type).toBe("general")
			expect(result.warnings[0]?.message).toContain("No routes array found")
		})

		it("should include line number in spread operator warning", () => {
			const routesFile = join(testDir, "routes.ts")
			writeFileSync(
				routesFile,
				`
const dynamicRoutes = []

export const routes = [
  {
    path: '/',
    component: () => import('./views/Home.vue'),
  },
  ...dynamicRoutes,
]
`,
			)

			const result = parseVueRouterConfig(routesFile)

			expect(result.warnings).toHaveLength(1)
			expect(result.warnings[0]?.type).toBe("spread")
			expect(result.warnings[0]?.message).toMatch(/at line \d+/)
			expect(result.warnings[0]?.line).toBeDefined()
		})
	})

	describe("flattenRoutes", () => {
		it("should flatten nested routes with full paths", () => {
			const routes = [
				{
					path: "/user/:id",
					name: "user",
					component: "/views/User.vue",
					children: [
						{
							path: "profile",
							name: "user-profile",
							component: "/views/UserProfile.vue",
						},
						{
							path: "settings",
							name: "user-settings",
							component: "/views/UserSettings.vue",
						},
					],
				},
			]

			const flat = flattenRoutes(routes)

			expect(flat).toHaveLength(3)
			expect(flat[0]?.fullPath).toBe("/user/:id")
			expect(flat[0]?.screenId).toBe("user.id")
			expect(flat[1]?.fullPath).toBe("/user/:id/profile")
			expect(flat[1]?.screenId).toBe("user.id.profile")
			expect(flat[2]?.fullPath).toBe("/user/:id/settings")
			expect(flat[2]?.screenId).toBe("user.id.settings")
		})

		it("should skip redirect-only routes", () => {
			const routes = [
				{
					path: "/old",
					redirect: "/new",
				},
				{
					path: "/new",
					component: "/views/New.vue",
				},
			]

			const flat = flattenRoutes(routes)

			expect(flat).toHaveLength(1)
			expect(flat[0]?.fullPath).toBe("/new")
		})

		it("should handle root path", () => {
			const routes = [
				{
					path: "/",
					component: "/views/Home.vue",
				},
			]

			const flat = flattenRoutes(routes)

			expect(flat).toHaveLength(1)
			expect(flat[0]?.fullPath).toBe("/")
			expect(flat[0]?.screenId).toBe("home")
			expect(flat[0]?.screenTitle).toBe("Home")
		})

		it("should track depth correctly", () => {
			const routes = [
				{
					path: "/a",
					component: "/views/A.vue",
					children: [
						{
							path: "b",
							component: "/views/B.vue",
							children: [
								{
									path: "c",
									component: "/views/C.vue",
								},
							],
						},
					],
				},
			]

			const flat = flattenRoutes(routes)

			expect(flat[0]?.depth).toBe(0)
			expect(flat[1]?.depth).toBe(1)
			expect(flat[2]?.depth).toBe(2)
		})
	})

	describe("pathToScreenId", () => {
		it("should convert root path to home", () => {
			expect(pathToScreenId("/").screenId).toBe("home")
			expect(pathToScreenId("").screenId).toBe("home")
		})

		it("should convert simple paths", () => {
			expect(pathToScreenId("/users").screenId).toBe("users")
			expect(pathToScreenId("/admin/settings").screenId).toBe("admin.settings")
		})

		it("should convert dynamic segments", () => {
			expect(pathToScreenId("/user/:id").screenId).toBe("user.id")
			expect(
				pathToScreenId("/posts/:postId/comments/:commentId").screenId,
			).toBe("posts.postId.comments.commentId")
		})

		it("should handle catchall segments", () => {
			expect(pathToScreenId("/docs/*path").screenId).toBe("docs.path")
			expect(pathToScreenId("/files/*").screenId).toBe("files.catchall")
		})
	})

	describe("pathToScreenTitle", () => {
		it("should convert root path to Home", () => {
			expect(pathToScreenTitle("/")).toBe("Home")
			expect(pathToScreenTitle("")).toBe("Home")
		})

		it("should use last segment as title", () => {
			expect(pathToScreenTitle("/users")).toBe("Users")
			expect(pathToScreenTitle("/admin/settings")).toBe("Settings")
		})

		it("should skip dynamic segments", () => {
			expect(pathToScreenTitle("/user/:id")).toBe("User")
			expect(pathToScreenTitle("/user/:id/profile")).toBe("Profile")
		})

		it("should convert kebab-case to Title Case", () => {
			expect(pathToScreenTitle("/user-profile")).toBe("User Profile")
			expect(pathToScreenTitle("/billing-settings")).toBe("Billing Settings")
		})

		it("should convert snake_case to Title Case", () => {
			expect(pathToScreenTitle("/user_profile")).toBe("User Profile")
		})
	})
})
