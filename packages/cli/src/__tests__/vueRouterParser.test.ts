import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { SpreadWarning } from "../utils/routeParserUtils.js"
import {
	clearImportedRoutesCache,
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
		clearImportedRoutesCache()
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

	describe("spread operator resolution", () => {
		describe("local variable resolution", () => {
			it("should resolve spread of local variable with routes", () => {
				const routesFile = join(testDir, "routes.ts")
				writeFileSync(
					routesFile,
					`
const devRoutes = [
  {
    path: '/dev',
    component: () => import('./views/Dev.vue'),
  },
  {
    path: '/debug',
    component: () => import('./views/Debug.vue'),
  },
]

export const routes = [
  {
    path: '/',
    component: () => import('./views/Home.vue'),
  },
  ...devRoutes,
]
`,
				)

				const result = parseVueRouterConfig(routesFile)

				expect(result.routes).toHaveLength(3)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/dev")
				expect(result.routes[2]?.path).toBe("/debug")
				// Should have resolved warning
				const spreadWarning = result.warnings.find(
					(w) => w.type === "spread",
				) as SpreadWarning | undefined
				expect(spreadWarning?.resolved).toBe(true)
			})

			it("should resolve spread of local variable defined after routes", () => {
				const routesFile = join(testDir, "routes.ts")
				writeFileSync(
					routesFile,
					`
export const routes = [
  {
    path: '/',
    component: () => import('./views/Home.vue'),
  },
  ...adminRoutes,
]

const adminRoutes = [
  {
    path: '/admin',
    component: () => import('./views/Admin.vue'),
  },
]
`,
				)

				const result = parseVueRouterConfig(routesFile)

				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/admin")
			})

			it("should resolve nested spreads in local variables", () => {
				const routesFile = join(testDir, "routes.ts")
				writeFileSync(
					routesFile,
					`
const innerRoutes = [
  {
    path: '/inner',
    component: () => import('./views/Inner.vue'),
  },
]

const outerRoutes = [
  {
    path: '/outer',
    component: () => import('./views/Outer.vue'),
  },
  ...innerRoutes,
]

export const routes = [
  ...outerRoutes,
]
`,
				)

				const result = parseVueRouterConfig(routesFile)

				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("/outer")
				expect(result.routes[1]?.path).toBe("/inner")
			})
		})

		describe("conditional spread resolution", () => {
			it("should resolve ternary with array on true branch", () => {
				const routesFile = join(testDir, "routes.ts")
				writeFileSync(
					routesFile,
					`
const devRoutes = [
  {
    path: '/dev',
    component: () => import('./views/Dev.vue'),
  },
]

export const routes = [
  {
    path: '/',
    component: () => import('./views/Home.vue'),
  },
  ...(true ? devRoutes : []),
]
`,
				)

				const result = parseVueRouterConfig(routesFile)

				// Should resolve routes from the true branch
				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/dev")
			})

			it("should resolve ternary with variable on false branch", () => {
				const routesFile = join(testDir, "routes.ts")
				writeFileSync(
					routesFile,
					`
const prodRoutes = [
  {
    path: '/prod',
    component: () => import('./views/Prod.vue'),
  },
]

export const routes = [
  {
    path: '/',
    component: () => import('./views/Home.vue'),
  },
  ...(false ? [] : prodRoutes),
]
`,
				)

				const result = parseVueRouterConfig(routesFile)

				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/prod")
			})

			it("should merge routes from both branches of conditional", () => {
				const routesFile = join(testDir, "routes.ts")
				writeFileSync(
					routesFile,
					`
const devRoutes = [
  {
    path: '/dev',
    component: () => import('./views/Dev.vue'),
  },
]

const prodRoutes = [
  {
    path: '/prod',
    component: () => import('./views/Prod.vue'),
  },
]

export const routes = [
  ...(import.meta.env.PROD ? prodRoutes : devRoutes),
]
`,
				)

				const result = parseVueRouterConfig(routesFile)

				// Static analysis merges both branches
				expect(result.routes).toHaveLength(2)
				expect(result.routes.map((r) => r.path)).toContain("/dev")
				expect(result.routes.map((r) => r.path)).toContain("/prod")
			})
		})

		describe("logical expression spread resolution", () => {
			it("should resolve && operator with right operand", () => {
				const routesFile = join(testDir, "routes.ts")
				writeFileSync(
					routesFile,
					`
const devRoutes = [
  {
    path: '/dev',
    component: () => import('./views/Dev.vue'),
  },
]

export const routes = [
  {
    path: '/',
    component: () => import('./views/Home.vue'),
  },
  ...(isDev && devRoutes),
]
`,
				)

				const result = parseVueRouterConfig(routesFile)

				expect(result.routes).toHaveLength(2)
				expect(result.routes[1]?.path).toBe("/dev")
			})

			it("should resolve || operator with both operands", () => {
				const routesFile = join(testDir, "routes.ts")
				writeFileSync(
					routesFile,
					`
const defaultRoutes = [
  {
    path: '/default',
    component: () => import('./views/Default.vue'),
  },
]

const fallbackRoutes = [
  {
    path: '/fallback',
    component: () => import('./views/Fallback.vue'),
  },
]

export const routes = [
  ...(defaultRoutes || fallbackRoutes),
]
`,
				)

				const result = parseVueRouterConfig(routesFile)

				// Static analysis includes both operands
				expect(result.routes).toHaveLength(2)
			})
		})

		describe("imported routes resolution", () => {
			it("should resolve spread from named import", () => {
				// Create the imported routes file
				const adminRoutesFile = join(testDir, "admin-routes.ts")
				writeFileSync(
					adminRoutesFile,
					`
export const adminRoutes = [
  {
    path: '/admin',
    component: () => import('./views/Admin.vue'),
  },
  {
    path: '/admin/users',
    component: () => import('./views/AdminUsers.vue'),
  },
]
`,
				)

				const routesFile = join(testDir, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { adminRoutes } from './admin-routes'

export const routes = [
  {
    path: '/',
    component: () => import('./views/Home.vue'),
  },
  ...adminRoutes,
]
`,
				)

				const result = parseVueRouterConfig(routesFile)

				expect(result.routes).toHaveLength(3)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/admin")
				expect(result.routes[2]?.path).toBe("/admin/users")
			})

			it("should resolve spread from multiple imported files", () => {
				// Create admin routes file
				const adminRoutesFile = join(testDir, "admin-routes.ts")
				writeFileSync(
					adminRoutesFile,
					`
export const adminRoutes = [
  {
    path: '/admin',
    component: () => import('./views/Admin.vue'),
  },
]
`,
				)

				// Create public routes file
				const publicRoutesFile = join(testDir, "public-routes.ts")
				writeFileSync(
					publicRoutesFile,
					`
export const publicRoutes = [
  {
    path: '/about',
    component: () => import('./views/About.vue'),
  },
]
`,
				)

				const routesFile = join(testDir, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { adminRoutes } from './admin-routes'
import { publicRoutes } from './public-routes'

export const routes = [
  {
    path: '/',
    component: () => import('./views/Home.vue'),
  },
  ...adminRoutes,
  ...publicRoutes,
]
`,
				)

				const result = parseVueRouterConfig(routesFile)

				expect(result.routes).toHaveLength(3)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/admin")
				expect(result.routes[2]?.path).toBe("/about")
			})
		})

		describe("unresolvable cases", () => {
			it("should warn for function call results", () => {
				const routesFile = join(testDir, "routes.ts")
				writeFileSync(
					routesFile,
					`
function getRoutes() {
  return [{ path: '/dynamic', component: () => import('./views/Dynamic.vue') }]
}

export const routes = [
  {
    path: '/',
    component: () => import('./views/Home.vue'),
  },
  ...getRoutes(),
]
`,
				)

				const result = parseVueRouterConfig(routesFile)

				expect(result.routes).toHaveLength(1)
				const spreadWarning = result.warnings.find(
					(w) => w.type === "spread",
				) as SpreadWarning | undefined
				expect(spreadWarning?.resolved).toBe(false)
				expect(spreadWarning?.resolutionFailureReason).toBe(
					"Function call results cannot be statically resolved",
				)
			})

			it("should warn for undefined variables", () => {
				const routesFile = join(testDir, "routes.ts")
				writeFileSync(
					routesFile,
					`
export const routes = [
  {
    path: '/',
    component: () => import('./views/Home.vue'),
  },
  ...unknownRoutes,
]
`,
				)

				const result = parseVueRouterConfig(routesFile)

				expect(result.routes).toHaveLength(1)
				const spreadWarning = result.warnings.find(
					(w) => w.type === "spread",
				) as SpreadWarning | undefined
				expect(spreadWarning?.resolved).toBe(false)
				expect(spreadWarning?.resolutionFailureReason).toContain(
					"unknownRoutes",
				)
			})

			it("should handle non-existent imported route files gracefully", () => {
				const routesFile = join(testDir, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { missingRoutes } from './does-not-exist'

export const routes = [
  {
    path: '/',
    component: () => import('./views/Home.vue'),
  },
  ...missingRoutes,
]
`,
				)

				const result = parseVueRouterConfig(routesFile)

				expect(result.routes).toHaveLength(1)
				const spreadWarning = result.warnings.find(
					(w) => w.type === "spread",
				) as SpreadWarning | undefined
				expect(spreadWarning?.resolved).toBe(false)

				// Should have a warning about the missing file
				const fileNotFoundWarning = result.warnings.find(
					(w) =>
						w.type === "general" &&
						w.message.includes("Could not find imported routes file"),
				)
				expect(fileNotFoundWarning).toBeDefined()
			})

			it("should handle syntax errors in imported route files gracefully", () => {
				// Create a file with syntax error
				const brokenFile = join(testDir, "broken-routes.ts")
				writeFileSync(
					brokenFile,
					`
export const brokenRoutes = [
  { path: '/broken' // Missing closing brace - syntax error
]
`,
				)

				const routesFile = join(testDir, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { brokenRoutes } from './broken-routes'

export const routes = [
  {
    path: '/',
    component: () => import('./views/Home.vue'),
  },
  ...brokenRoutes,
]
`,
				)

				const result = parseVueRouterConfig(routesFile)

				expect(result.routes).toHaveLength(1)
				const spreadWarning = result.warnings.find(
					(w) => w.type === "spread",
				) as SpreadWarning | undefined
				expect(spreadWarning?.resolved).toBe(false)

				// Should have a warning about syntax error
				const syntaxErrorWarning = result.warnings.find(
					(w) => w.type === "general" && w.message.includes("Syntax error"),
				)
				expect(syntaxErrorWarning).toBeDefined()
			})

			it("should warn when imported variable not exported in file", () => {
				// Create file that exports a different variable
				const otherFile = join(testDir, "other-routes.ts")
				writeFileSync(
					otherFile,
					`
export const differentRoutes = [
  { path: '/different', component: () => import('./views/Different.vue') },
]
`,
				)

				const routesFile = join(testDir, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { expectedRoutes } from './other-routes'

export const routes = [
  {
    path: '/',
    component: () => import('./views/Home.vue'),
  },
  ...expectedRoutes,
]
`,
				)

				const result = parseVueRouterConfig(routesFile)

				expect(result.routes).toHaveLength(1)

				// Should have a warning about export not found
				const exportNotFoundWarning = result.warnings.find(
					(w) =>
						w.type === "general" &&
						w.message.includes("not found in") &&
						w.message.includes("expectedRoutes"),
				)
				expect(exportNotFoundWarning).toBeDefined()
			})

			it("should hint about route naming heuristic for non-route imports", () => {
				const routesFile = join(testDir, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { pages } from './pages'

export const routes = [
  {
    path: '/',
    component: () => import('./views/Home.vue'),
  },
  ...pages,
]
`,
				)

				const result = parseVueRouterConfig(routesFile)

				expect(result.routes).toHaveLength(1)
				const spreadWarning = result.warnings.find(
					(w) => w.type === "spread",
				) as SpreadWarning | undefined
				expect(spreadWarning?.resolved).toBe(false)
				// Should mention the naming heuristic
				expect(spreadWarning?.resolutionFailureReason).toContain(
					"Only imports with 'route' in the name are tracked",
				)
			})
		})

		describe("depth limiting", () => {
			it("should warn when maximum import depth is reached", () => {
				// Create a chain of imports that exceeds maxDepth (3)
				const level3 = join(testDir, "level3-routes.ts")
				writeFileSync(
					level3,
					`
export const level3Routes = [
  { path: '/level3', component: () => import('./views/L3.vue') },
]
`,
				)

				const level2 = join(testDir, "level2-routes.ts")
				writeFileSync(
					level2,
					`
import { level3Routes } from './level3-routes'
export const level2Routes = [...level3Routes]
`,
				)

				const level1 = join(testDir, "level1-routes.ts")
				writeFileSync(
					level1,
					`
import { level2Routes } from './level2-routes'
export const level1Routes = [...level2Routes]
`,
				)

				const level0 = join(testDir, "level0-routes.ts")
				writeFileSync(
					level0,
					`
import { level1Routes } from './level1-routes'
export const level0Routes = [...level1Routes]
`,
				)

				const routesFile = join(testDir, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { level0Routes } from './level0-routes'
export const routes = [...level0Routes]
`,
				)

				const result = parseVueRouterConfig(routesFile)

				// Should have a warning about max depth
				const depthWarning = result.warnings.find(
					(w) =>
						w.type === "general" && w.message.includes("Maximum import depth"),
				)
				expect(depthWarning).toBeDefined()
				expect(depthWarning?.message).toContain("3")
			})
		})

		describe("cache behavior", () => {
			it("should cache imported routes and reuse them", () => {
				const adminRoutesFile = join(testDir, "admin-routes.ts")
				writeFileSync(
					adminRoutesFile,
					`
export const adminRoutes = [
  { path: '/admin', component: () => import('./views/Admin.vue') },
]
`,
				)

				const routesFile = join(testDir, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { adminRoutes } from './admin-routes'
export const routes = [
  ...adminRoutes,
  ...adminRoutes,
]
`,
				)

				const result = parseVueRouterConfig(routesFile)

				// Should have 2 routes (same route resolved twice from cache)
				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("/admin")
				expect(result.routes[1]?.path).toBe("/admin")
			})
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
