import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { flattenRoutes, type SpreadWarning } from "../utils/routeParserUtils.js"
import {
	clearImportedRoutesCache,
	isSolidRouterContent,
	parseSolidRouterConfig,
} from "../utils/solidRouterParser.js"

const TEST_DIR = ".test-solid-router-parser"

describe("solidRouterParser", () => {
	beforeEach(() => {
		rmSync(TEST_DIR, { recursive: true, force: true })
		mkdirSync(TEST_DIR, { recursive: true })
	})

	afterEach(() => {
		rmSync(TEST_DIR, { recursive: true, force: true })
	})

	describe("parseSolidRouterConfig", () => {
		describe("basic patterns", () => {
			it("should parse basic route with path and component", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Router } from "@solidjs/router"
import { Home } from "./pages/Home"
import { About } from "./pages/About"

export const routes = [
  { path: "/", component: Home },
  { path: "/about", component: About },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[0]?.component).toBe("Home")
				expect(result.routes[1]?.path).toBe("/about")
				expect(result.routes[1]?.component).toBe("About")
			})

			it("should parse route with lazy component", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { lazy } from "solid-js"
import { Router } from "@solidjs/router"

export const routes = [
  { path: "/", component: lazy(() => import("./pages/Home")) },
  { path: "/dashboard", component: lazy(() => import("./pages/Dashboard")) },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.component).toContain("pages/Home")
				expect(result.routes[1]?.component).toContain("pages/Dashboard")
			})

			it("should handle nested routes with children", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Router } from "@solidjs/router"

export const routes = [
  {
    path: "/dashboard",
    component: DashboardLayout,
    children: [
      { path: "", component: DashboardHome },
      { path: "settings", component: Settings },
    ],
  },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
				expect(result.routes[0]?.path).toBe("/dashboard")
				expect(result.routes[0]?.children).toHaveLength(2)

				const flat = flattenRoutes(result.routes)
				expect(flat).toHaveLength(3)
				expect(flat[0]?.fullPath).toBe("/dashboard")
				expect(flat[1]?.fullPath).toBe("/dashboard")
				expect(flat[2]?.fullPath).toBe("/dashboard/settings")
			})

			it("should handle deeply nested routes", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
export const routes = [
  {
    path: "/admin",
    component: AdminLayout,
    children: [
      {
        path: "users",
        component: UsersLayout,
        children: [
          { path: ":id", component: UserDetail },
        ],
      },
    ],
  },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				const flat = flattenRoutes(result.routes)

				expect(flat).toHaveLength(3)
				expect(flat[0]?.fullPath).toBe("/admin")
				expect(flat[1]?.fullPath).toBe("/admin/users")
				expect(flat[2]?.fullPath).toBe("/admin/users/:id")
			})
		})

		describe("Solid Router specific features", () => {
			it("should handle multiple paths array", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Router } from "@solidjs/router"

export const routes = [
  {
    path: ["/login", "/register", "/auth"],
    component: AuthPage,
  },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				// Multiple paths should create multiple routes
				expect(result.routes).toHaveLength(3)
				expect(result.routes[0]?.path).toBe("/login")
				expect(result.routes[0]?.component).toBe("AuthPage")
				expect(result.routes[1]?.path).toBe("/register")
				expect(result.routes[1]?.component).toBe("AuthPage")
				expect(result.routes[2]?.path).toBe("/auth")
				expect(result.routes[2]?.component).toBe("AuthPage")
			})

			it("should handle path array with children", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
export const routes = [
  {
    path: ["/app", "/dashboard"],
    component: Layout,
    children: [
      { path: "settings", component: Settings },
    ],
  },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(result.routes).toHaveLength(2)

				// Both paths should have the same children
				expect(result.routes[0]?.children).toHaveLength(1)
				expect(result.routes[1]?.children).toHaveLength(1)
			})
		})

		describe("component extraction", () => {
			it("should extract component from identifier", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
export const routes = [
  { path: "/", component: HomePage },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(result.routes[0]?.component).toBe("HomePage")
			})

			it("should extract component from lazy(() => import(...))", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { lazy } from "solid-js"

export const routes = [
  { path: "/users", component: lazy(() => import("./pages/Users")) },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(result.routes[0]?.component).toContain("pages/Users")
			})

			it("should extract component from arrow function returning JSX", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
export const routes = [
  { path: "/", component: () => <Home /> },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(result.routes[0]?.component).toBe("Home")
			})
		})

		describe("path handling", () => {
			it("should handle dynamic segments :param", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
export const routes = [
  { path: "/users/:userId", component: User },
  { path: "/posts/:postId/comments/:commentId", component: Comment },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(result.routes[0]?.path).toBe("/users/:userId")
				expect(result.routes[1]?.path).toBe(
					"/posts/:postId/comments/:commentId",
				)

				const flat = flattenRoutes(result.routes)
				expect(flat[0]?.screenId).toBe("users.userId")
				expect(flat[1]?.screenId).toBe("posts.postId.comments.commentId")
			})

			it("should handle wildcard paths *", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
export const routes = [
  { path: "/docs/*", component: Docs },
  { path: "/*all", component: NotFound },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(result.routes).toHaveLength(2)

				const flat = flattenRoutes(result.routes)
				expect(flat[0]?.screenId).toBe("docs.catchall")
				expect(flat[1]?.screenId).toBe("all")
			})

			it("should skip routes without path", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
export const routes = [
  { component: LayoutOnly },
  { path: "/about", component: About },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
				expect(result.routes[0]?.path).toBe("/about")
			})

			it("should handle layout routes without path but with children", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
export const routes = [
  {
    component: MainLayout,
    children: [
      { path: "/", component: Home },
      { path: "/about", component: About },
    ],
  },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
				expect(result.routes[0]?.path).toBe("")
				expect(result.routes[0]?.children).toHaveLength(2)

				const flat = flattenRoutes(result.routes)
				expect(flat).toHaveLength(3)
			})
		})

		describe("edge cases", () => {
			it("should warn on spread operator in routes array", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
const otherRoutes = [{ path: "/other", component: Other }]

export const routes = [
  { path: "/", component: Home },
  ...otherRoutes,
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(
					result.warnings.some(
						(w) => w.type === "spread" && w.message.includes("Spread operator"),
					),
				).toBe(true)
			})

			it("should warn on dynamic path value", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
const dynamicPath = "/dynamic"

export const routes = [
  { path: dynamicPath, component: Dynamic },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(
					result.warnings.some((w) => w.message.includes("Dynamic path")),
				).toBe(true)
			})

			it("should warn on non-string in path array", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
const otherPath = "/other"

export const routes = [
  { path: ["/login", otherPath], component: Auth },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(
					result.warnings.some((w) =>
						w.message.includes("Non-string path in array"),
					),
				).toBe(true)
				// Should still extract the string literal path
				expect(result.routes).toHaveLength(1)
				expect(result.routes[0]?.path).toBe("/login")
			})

			it("should warn on lazy() without arguments", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { lazy } from "solid-js"

export const routes = [
  { path: "/", component: lazy() },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(
					result.warnings.some((w) =>
						w.message.includes("lazy() called without"),
					),
				).toBe(true)
			})

			it("should warn if no routes found", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
// Empty file
const x = 1
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(result.routes).toHaveLength(0)
				expect(
					result.warnings.some((w) => w.message.includes("No routes found")),
				).toBe(true)
			})

			it("should throw on file not found", () => {
				expect(() => {
					parseSolidRouterConfig(join(TEST_DIR, "nonexistent.ts"))
				}).toThrow("Failed to read routes file")
			})

			it("should throw on syntax errors", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
export const routes = [
  { path: "/",
]
`,
				)

				expect(() => {
					parseSolidRouterConfig(routesFile)
				}).toThrow("Syntax error")
			})

			it("should warn on non-object route elements", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
const getRoute = () => ({ path: "/dynamic", component: Dynamic })

export const routes = [
  { path: "/", component: Home },
  getRoute(),
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(
					result.warnings.some((w) =>
						w.message.includes("Non-object route element"),
					),
				).toBe(true)
				// Should still parse the static route
				expect(result.routes).toHaveLength(1)
				expect(result.routes[0]?.path).toBe("/")
			})

			it("should warn on lazy() with dynamic import path", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { lazy } from "solid-js"

const pagePath = "./pages/Dynamic"

export const routes = [
  { path: "/", component: lazy(() => import(pagePath)) },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(
					result.warnings.some((w) =>
						w.message.includes("Lazy import with dynamic"),
					),
				).toBe(true)
			})

			it("should warn on unrecognized lazy pattern", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { lazy } from "solid-js"

function loadHome() { return import("./pages/Home") }

export const routes = [
  { path: "/", component: lazy(loadHome) },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(
					result.warnings.some((w) =>
						w.message.includes("Unrecognized lazy pattern"),
					),
				).toBe(true)
			})

			it("should handle sparse route arrays gracefully", () => {
				const content = `
export const routes = [
  { path: "/", component: Home },
  ,
  { path: "/about", component: About },
]
`
				const result = parseSolidRouterConfig("virtual.ts", content)
				expect(result.routes).toHaveLength(2)
				expect(result.warnings).toHaveLength(0)
			})

			it("should warn on path array with only dynamic values", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
const path1 = "/login"
const path2 = "/register"

export const routes = [
  { path: [path1, path2], component: Auth },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(
					result.warnings.some((w) =>
						w.message.includes("Path array contains only dynamic"),
					),
				).toBe(true)
			})

			it("should warn on unrecognized component call expression", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
export const routes = [
  { path: "/", component: withAuth(Home) },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(
					result.warnings.some((w) =>
						w.message.includes("Unrecognized component pattern"),
					),
				).toBe(true)
			})

			it("should warn on arrow function with block body", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
export const routes = [
  { path: "/", component: () => { return <Home /> } },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(
					result.warnings.some((w) =>
						w.message.includes("Arrow function with block body"),
					),
				).toBe(true)
			})

			it("should warn on JSX fragment component", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
export const routes = [
  { path: "/", component: () => <><Home /></> },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(
					result.warnings.some((w) =>
						w.message.includes("JSX Fragment detected"),
					),
				).toBe(true)
			})

			it("should warn on conditional component expression", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
export const routes = [
  { path: "/", component: () => isAdmin ? <Admin /> : <User /> },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(
					result.warnings.some((w) =>
						w.message.includes("Conditional component"),
					),
				).toBe(true)
				// Should include component names in the warning
				expect(
					result.warnings.some(
						(w) => w.message.includes("Admin") && w.message.includes("User"),
					),
				).toBe(true)
			})
		})

		describe("export patterns", () => {
			it("should parse export default array", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
export default [
  { path: "/", component: Home },
  { path: "/about", component: About },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(result.routes).toHaveLength(2)
			})

			it("should parse export default with satisfies", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import type { RouteDefinition } from "@solidjs/router"

export default [
  { path: "/", component: Home },
] satisfies RouteDefinition[]
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
			})

			it("should parse non-exported routes variable", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
const routes = [
  { path: "/", component: Home },
]

export { routes }
`,
				)

				const result = parseSolidRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
			})
		})

		describe("preloaded content", () => {
			it("should parse from preloaded content string", () => {
				const content = `
import { Router } from "@solidjs/router"

export const routes = [
  { path: "/", component: Home },
  { path: "/about", component: About },
]
`

				const result = parseSolidRouterConfig("virtual.ts", content)
				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("/")
			})
		})
	})

	describe("isSolidRouterContent", () => {
		it("should detect @solidjs/router import", () => {
			expect(
				isSolidRouterContent('import { Router } from "@solidjs/router"'),
			).toBe(true)
		})

		it("should detect solid-app-router import (old package)", () => {
			expect(
				isSolidRouterContent('import { Router } from "solid-app-router"'),
			).toBe(true)
		})

		it("should detect solid-js with lazy and route pattern", () => {
			const content = `
import { lazy } from "solid-js"
const routes = [
  { path: "/", component: lazy(() => import("./Home")) },
]
`
			expect(isSolidRouterContent(content)).toBe(true)
		})

		it("should return false for React Router content", () => {
			expect(
				isSolidRouterContent("const router = createBrowserRouter([])"),
			).toBe(false)
		})

		it("should return false for Vue Router content", () => {
			expect(
				isSolidRouterContent('import { createRouter } from "vue-router"'),
			).toBe(false)
		})

		it("should return false for TanStack Router content", () => {
			expect(
				isSolidRouterContent(
					'import { createRoute } from "@tanstack/react-router"',
				),
			).toBe(false)
		})

		it("should return false for plain JavaScript", () => {
			expect(isSolidRouterContent("const routes = []")).toBe(false)
		})
	})

	describe("spread operator resolution", () => {
		beforeEach(() => {
			clearImportedRoutesCache()
		})

		describe("local variable resolution", () => {
			it("should resolve spread of local variable with routes", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { lazy } from "solid-js"

const devRoutes = [
  {
    path: "/dev",
    component: lazy(() => import("./pages/Dev")),
  },
  {
    path: "/debug",
    component: lazy(() => import("./pages/Debug")),
  },
]

export const routes = [
  {
    path: "/",
    component: lazy(() => import("./pages/Home")),
  },
  ...devRoutes,
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)

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
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { lazy } from "solid-js"

export const routes = [
  {
    path: "/",
    component: lazy(() => import("./pages/Home")),
  },
  ...adminRoutes,
]

const adminRoutes = [
  {
    path: "/admin",
    component: lazy(() => import("./pages/Admin")),
  },
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)

				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/admin")
			})

			it("should resolve nested spreads in local variables", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { lazy } from "solid-js"

const innerRoutes = [
  {
    path: "/inner",
    component: lazy(() => import("./pages/Inner")),
  },
]

const outerRoutes = [
  {
    path: "/outer",
    component: lazy(() => import("./pages/Outer")),
  },
  ...innerRoutes,
]

export const routes = [
  ...outerRoutes,
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)

				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("/outer")
				expect(result.routes[1]?.path).toBe("/inner")
			})
		})

		describe("conditional spread resolution", () => {
			it("should resolve ternary with array on true branch", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { lazy } from "solid-js"

export const routes = [
  {
    path: "/",
    component: lazy(() => import("./pages/Home")),
  },
  // biome-ignore lint/correctness/noConstantCondition: Intentional for testing
  ...(true ? [{ path: "/dev", component: lazy(() => import("./pages/Dev")) }] : []),
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)

				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/dev")
			})

			it("should merge routes from both branches of conditional", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { lazy } from "solid-js"

const devRoutes = [
  {
    path: "/dev",
    component: lazy(() => import("./pages/Dev")),
  },
]

const prodRoutes = [
  {
    path: "/prod",
    component: lazy(() => import("./pages/Prod")),
  },
]

export const routes = [
  ...(import.meta.env.PROD ? prodRoutes : devRoutes),
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)

				// Static analysis merges both branches
				expect(result.routes).toHaveLength(2)
				expect(result.routes.map((r) => r.path)).toContain("/dev")
				expect(result.routes.map((r) => r.path)).toContain("/prod")
			})
		})

		describe("logical expression spread resolution", () => {
			it("should resolve && operator with right operand", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { lazy } from "solid-js"

const devRoutes = [
  {
    path: "/dev",
    component: lazy(() => import("./pages/Dev")),
  },
]

const isDev = true

export const routes = [
  {
    path: "/",
    component: lazy(() => import("./pages/Home")),
  },
  ...(isDev && devRoutes),
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)

				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/dev")
			})

			it("should resolve || operator with both operands", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { lazy } from "solid-js"

const primaryRoutes = [
  {
    path: "/primary",
    component: lazy(() => import("./pages/Primary")),
  },
]

const fallbackRoutes = [
  {
    path: "/fallback",
    component: lazy(() => import("./pages/Fallback")),
  },
]

export const routes = [
  ...(primaryRoutes || fallbackRoutes),
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)

				// Static analysis includes both operands
				expect(result.routes).toHaveLength(2)
				expect(result.routes.map((r) => r.path)).toContain("/primary")
				expect(result.routes.map((r) => r.path)).toContain("/fallback")
			})
		})

		describe("imported routes resolution", () => {
			it("should resolve spread from named import", () => {
				// Create the imported routes file
				const adminRoutesFile = join(TEST_DIR, "admin-routes.ts")
				writeFileSync(
					adminRoutesFile,
					`
import { lazy } from "solid-js"

export const adminRoutes = [
  {
    path: "/admin",
    component: lazy(() => import("./pages/Admin")),
  },
  {
    path: "/admin/users",
    component: lazy(() => import("./pages/AdminUsers")),
  },
]
`,
				)

				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { lazy } from "solid-js"
import { adminRoutes } from "./admin-routes"

export const routes = [
  {
    path: "/",
    component: lazy(() => import("./pages/Home")),
  },
  ...adminRoutes,
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)

				expect(result.routes).toHaveLength(3)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/admin")
				expect(result.routes[2]?.path).toBe("/admin/users")
			})

			it("should resolve spread from multiple imported files", () => {
				// Create admin routes file
				const adminRoutesFile = join(TEST_DIR, "admin-routes.ts")
				writeFileSync(
					adminRoutesFile,
					`
import { lazy } from "solid-js"

export const adminRoutes = [
  {
    path: "/admin",
    component: lazy(() => import("./pages/Admin")),
  },
]
`,
				)

				// Create dev routes file
				const devRoutesFile = join(TEST_DIR, "dev-routes.ts")
				writeFileSync(
					devRoutesFile,
					`
import { lazy } from "solid-js"

export const devRoutes = [
  {
    path: "/dev",
    component: lazy(() => import("./pages/Dev")),
  },
]
`,
				)

				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { lazy } from "solid-js"
import { adminRoutes } from "./admin-routes"
import { devRoutes } from "./dev-routes"

export const routes = [
  {
    path: "/",
    component: lazy(() => import("./pages/Home")),
  },
  ...adminRoutes,
  ...devRoutes,
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)

				expect(result.routes).toHaveLength(3)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/admin")
				expect(result.routes[2]?.path).toBe("/dev")
			})

			it("should respect maxDepth limit", () => {
				// Create deeply nested import chain
				const level3File = join(TEST_DIR, "level3-routes.ts")
				writeFileSync(
					level3File,
					`
import { lazy } from "solid-js"

export const level3Routes = [
  {
    path: "/level3",
    component: lazy(() => import("./pages/Level3")),
  },
]
`,
				)

				const level2File = join(TEST_DIR, "level2-routes.ts")
				writeFileSync(
					level2File,
					`
import { lazy } from "solid-js"
import { level3Routes } from "./level3-routes"

export const level2Routes = [
  {
    path: "/level2",
    component: lazy(() => import("./pages/Level2")),
  },
  ...level3Routes,
]
`,
				)

				const level1File = join(TEST_DIR, "level1-routes.ts")
				writeFileSync(
					level1File,
					`
import { lazy } from "solid-js"
import { level2Routes } from "./level2-routes"

export const level1Routes = [
  {
    path: "/level1",
    component: lazy(() => import("./pages/Level1")),
  },
  ...level2Routes,
]
`,
				)

				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { lazy } from "solid-js"
import { level1Routes } from "./level1-routes"

export const routes = [
  {
    path: "/",
    component: lazy(() => import("./pages/Home")),
  },
  ...level1Routes,
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)

				// Should resolve up to depth 3
				expect(result.routes).toHaveLength(4)
				expect(result.routes.map((r) => r.path)).toContain("/")
				expect(result.routes.map((r) => r.path)).toContain("/level1")
				expect(result.routes.map((r) => r.path)).toContain("/level2")
				expect(result.routes.map((r) => r.path)).toContain("/level3")
			})
		})

		describe("unresolvable cases", () => {
			it("should warn for function call results", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { lazy } from "solid-js"

function getRoutes() {
  return [{ path: "/dynamic", component: lazy(() => import("./pages/Dynamic")) }]
}

export const routes = [
  {
    path: "/",
    component: lazy(() => import("./pages/Home")),
  },
  ...getRoutes(),
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)

				expect(result.routes).toHaveLength(1)
				const spreadWarning = result.warnings.find(
					(w) => w.type === "spread",
				) as SpreadWarning | undefined
				expect(spreadWarning?.resolved).toBe(false)
				expect(spreadWarning?.resolutionFailureReason).toContain(
					"Function call results cannot be statically resolved",
				)
			})

			it("should warn for undefined variables", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { lazy } from "solid-js"

export const routes = [
  {
    path: "/",
    component: lazy(() => import("./pages/Home")),
  },
  ...unknownRoutes,
]
`,
				)

				const result = parseSolidRouterConfig(routesFile)

				expect(result.routes).toHaveLength(1)
				const spreadWarning = result.warnings.find(
					(w) => w.type === "spread",
				) as SpreadWarning | undefined
				expect(spreadWarning?.resolved).toBe(false)
				expect(spreadWarning?.resolutionFailureReason).toContain(
					"Variable 'unknownRoutes' not found",
				)
			})
		})

		describe("cache management", () => {
			it("should clear cache with clearImportedRoutesCache()", () => {
				// Create an imported routes file
				const adminRoutesFile = join(TEST_DIR, "admin-routes.ts")
				writeFileSync(
					adminRoutesFile,
					`
import { lazy } from "solid-js"

export const adminRoutes = [
  {
    path: "/admin",
    component: lazy(() => import("./pages/Admin")),
  },
]
`,
				)

				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { lazy } from "solid-js"
import { adminRoutes } from "./admin-routes"

export const routes = [
  ...adminRoutes,
]
`,
				)

				// First parse
				const result1 = parseSolidRouterConfig(routesFile)
				expect(result1.routes).toHaveLength(1)
				expect(result1.routes[0]?.path).toBe("/admin")

				// Modify the imported file
				writeFileSync(
					adminRoutesFile,
					`
import { lazy } from "solid-js"

export const adminRoutes = [
  {
    path: "/admin/v2",
    component: lazy(() => import("./pages/AdminV2")),
  },
]
`,
				)

				// Parse again without clearing cache - should return old result
				const result2 = parseSolidRouterConfig(routesFile)
				expect(result2.routes[0]?.path).toBe("/admin")

				// Clear cache and parse again
				clearImportedRoutesCache()
				const result3 = parseSolidRouterConfig(routesFile)
				expect(result3.routes[0]?.path).toBe("/admin/v2")
			})
		})
	})
})
