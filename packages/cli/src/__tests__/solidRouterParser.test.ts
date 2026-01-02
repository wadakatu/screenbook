import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { flattenRoutes } from "../utils/routeParserUtils.js"
import {
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
				expect(result.warnings.some((w) => w.includes("Spread operator"))).toBe(
					true,
				)
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
				expect(result.warnings.some((w) => w.includes("Dynamic path"))).toBe(
					true,
				)
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
					result.warnings.some((w) => w.includes("Non-string path in array")),
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
					result.warnings.some((w) => w.includes("lazy() called without")),
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
				expect(result.warnings.some((w) => w.includes("No routes found"))).toBe(
					true,
				)
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
					result.warnings.some((w) => w.includes("Non-object route element")),
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
					result.warnings.some((w) => w.includes("Lazy import with dynamic")),
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
					result.warnings.some((w) => w.includes("Unrecognized lazy pattern")),
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
						w.includes("Path array contains only dynamic"),
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
						w.includes("Unrecognized component pattern"),
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
						w.includes("Arrow function with block body"),
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
					result.warnings.some((w) => w.includes("JSX Fragment detected")),
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
})
