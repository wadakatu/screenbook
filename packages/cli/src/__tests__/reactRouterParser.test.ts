import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
	detectRouterType,
	isReactRouterContent,
	isVueRouterContent,
	parseReactRouterConfig,
} from "../utils/reactRouterParser.js"
import { flattenRoutes } from "../utils/routeParserUtils.js"

const TEST_DIR = ".test-react-router-parser"

describe("reactRouterParser", () => {
	beforeEach(() => {
		rmSync(TEST_DIR, { recursive: true, force: true })
		mkdirSync(TEST_DIR, { recursive: true })
	})

	afterEach(() => {
		rmSync(TEST_DIR, { recursive: true, force: true })
	})

	describe("parseReactRouterConfig", () => {
		describe("pattern detection", () => {
			it("should parse createBrowserRouter([...])", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createBrowserRouter } from "react-router-dom"
import Home from "./pages/Home"
import Dashboard from "./pages/Dashboard"

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/dashboard", element: <Dashboard /> },
])

export default router
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(2)
				expect(result.routes[0].path).toBe("/")
				expect(result.routes[1].path).toBe("/dashboard")
			})

			it("should parse createHashRouter([...])", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createHashRouter } from "react-router-dom"

const router = createHashRouter([
  { path: "/", element: <Home /> },
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
				expect(result.routes[0].path).toBe("/")
			})

			it("should parse createMemoryRouter([...])", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createMemoryRouter } from "react-router-dom"

const router = createMemoryRouter([
  { path: "/", element: <Home /> },
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
			})

			it("should parse export const routes = [...]", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
export const routes = [
  { path: "/", element: <Home /> },
  { path: "/about", element: <About /> },
]
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(2)
			})

			it("should parse export default [...]", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
export default [
  { path: "/", element: <Home /> },
]
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
			})

			it("should parse export default [...] satisfies RouteObject[]", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import type { RouteObject } from "react-router-dom"

export default [
  { path: "/", element: <Home /> },
] satisfies RouteObject[]
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
			})

			it("should parse export const router = createBrowserRouter([...])", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createBrowserRouter } from "react-router-dom"
import { Home } from "./pages/Home"
import { Dashboard } from "./pages/Dashboard"

export const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/dashboard", element: <Dashboard /> },
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(2)
				expect(result.routes[0].path).toBe("/")
				expect(result.routes[0].component).toBe("Home")
				expect(result.routes[1].path).toBe("/dashboard")
				expect(result.routes[1].component).toBe("Dashboard")
			})
		})

		describe("component extraction", () => {
			it("should extract component from element: <Component />", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/dashboard", element: <Dashboard /> },
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes[0].component).toBe("Home")
				expect(result.routes[1].component).toBe("Dashboard")
			})

			it("should extract component from Component: Name", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const router = createBrowserRouter([
  { path: "/", Component: Home },
  { path: "/dashboard", Component: Dashboard },
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes[0].component).toBe("Home")
				expect(result.routes[1].component).toBe("Dashboard")
			})

			it("should extract path from lazy: () => import('./path')", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const router = createBrowserRouter([
  { path: "/", lazy: () => import("./pages/Home") },
  { path: "/dashboard", lazy: () => import("./pages/Dashboard") },
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes[0].component).toContain("pages/Home")
				expect(result.routes[1].component).toContain("pages/Dashboard")
			})

			it("should handle JSXMemberExpression like <Layout.Page />", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const router = createBrowserRouter([
  { path: "/", element: <Layout.Home /> },
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes[0].component).toBe("Layout.Home")
			})
		})

		describe("index routes", () => {
			it("should handle index: true routes", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      { index: true, element: <Home /> },
      { path: "dashboard", element: <Dashboard /> },
    ],
  },
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
				expect(result.routes[0].children).toHaveLength(2)
				expect(result.routes[0].children?.[0].path).toBe("")
				expect(result.routes[0].children?.[1].path).toBe("dashboard")
			})

			it("should compute correct path for nested index routes", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const router = createBrowserRouter([
  {
    path: "/dashboard",
    element: <DashboardLayout />,
    children: [
      { index: true, element: <DashboardHome /> },
      { path: "settings", element: <Settings /> },
    ],
  },
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				const flat = flattenRoutes(result.routes)

				// Should have: /dashboard, /dashboard (index), /dashboard/settings
				expect(flat).toHaveLength(3)
				expect(flat[0].fullPath).toBe("/dashboard")
				expect(flat[1].fullPath).toBe("/dashboard")
				expect(flat[2].fullPath).toBe("/dashboard/settings")
			})
		})

		describe("nested routes", () => {
			it("should parse nested children routes", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      { path: "dashboard", element: <Dashboard /> },
      { path: "settings", element: <Settings /> },
    ],
  },
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
				expect(result.routes[0].children).toHaveLength(2)
			})

			it("should flatten nested routes with correct full paths", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const router = createBrowserRouter([
  {
    path: "/user/:id",
    element: <UserLayout />,
    children: [
      { path: "profile", element: <Profile /> },
      { path: "settings", element: <Settings /> },
    ],
  },
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				const flat = flattenRoutes(result.routes)

				expect(flat).toHaveLength(3)
				expect(flat[0].fullPath).toBe("/user/:id")
				expect(flat[1].fullPath).toBe("/user/:id/profile")
				expect(flat[2].fullPath).toBe("/user/:id/settings")
			})

			it("should handle deeply nested routes (3+ levels)", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const router = createBrowserRouter([
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      {
        path: "users",
        element: <UsersLayout />,
        children: [
          { path: ":id", element: <UserDetail /> },
        ],
      },
    ],
  },
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				const flat = flattenRoutes(result.routes)

				expect(flat).toHaveLength(3)
				expect(flat[0].fullPath).toBe("/admin")
				expect(flat[1].fullPath).toBe("/admin/users")
				expect(flat[2].fullPath).toBe("/admin/users/:id")
			})
		})

		describe("edge cases", () => {
			it("should warn on spread operator", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const otherRoutes = [{ path: "/other", element: <Other /> }]

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  ...otherRoutes,
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.warnings).toHaveLength(1)
				expect(result.warnings[0]).toContain("Spread operator")
			})

			it("should handle layout routes (no path, just children)", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/about", element: <About /> },
    ],
  },
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				const flat = flattenRoutes(result.routes)

				// Layout route has empty path, children have their paths
				expect(flat).toHaveLength(3)
				expect(flat[0].fullPath).toBe("/")
				expect(flat[1].fullPath).toBe("/")
				expect(flat[2].fullPath).toBe("/about")
			})

			it("should handle dynamic segments :id", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const router = createBrowserRouter([
  { path: "/user/:id", element: <User /> },
  { path: "/post/:postId/comment/:commentId", element: <Comment /> },
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				const flat = flattenRoutes(result.routes)

				expect(flat[0].screenId).toBe("user.id")
				expect(flat[1].screenId).toBe("post.postId.comment.commentId")
			})

			it("should handle wildcard paths *", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const router = createBrowserRouter([
  { path: "/docs/*", element: <Docs /> },
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				const flat = flattenRoutes(result.routes)

				expect(flat[0].screenId).toBe("docs.catchall")
			})

			it("should warn if no routes found", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
// Empty file
const x = 1
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(0)
				expect(result.warnings).toHaveLength(1)
				expect(result.warnings[0]).toContain("No routes found")
			})

			it("should throw on file not found", () => {
				expect(() => {
					parseReactRouterConfig(join(TEST_DIR, "nonexistent.tsx"))
				}).toThrow("Failed to read routes file")
			})

			it("should throw on syntax errors", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const router = createBrowserRouter([
  { path: "/",
])
`,
				)

				expect(() => {
					parseReactRouterConfig(routesFile)
				}).toThrow("Syntax error")
			})
		})
	})

	describe("router type detection", () => {
		describe("isReactRouterContent", () => {
			it("should detect createBrowserRouter", () => {
				expect(
					isReactRouterContent(
						'const router = createBrowserRouter([{ path: "/" }])',
					),
				).toBe(true)
			})

			it("should detect createHashRouter", () => {
				expect(
					isReactRouterContent(
						'const router = createHashRouter([{ path: "/" }])',
					),
				).toBe(true)
			})

			it("should detect RouteObject type", () => {
				expect(
					isReactRouterContent('const routes: RouteObject[] = [{ path: "/" }]'),
				).toBe(true)
			})

			it("should detect element: <Component /> pattern", () => {
				expect(isReactRouterContent('{ path: "/", element: <Home /> }')).toBe(
					true,
				)
			})

			it("should detect Component: Name pattern", () => {
				expect(isReactRouterContent('{ path: "/", Component: Home }')).toBe(
					true,
				)
			})

			it("should return false for Vue Router content", () => {
				expect(
					isReactRouterContent('import { RouteRecordRaw } from "vue-router"'),
				).toBe(false)
			})
		})

		describe("isVueRouterContent", () => {
			it("should detect RouteRecordRaw type", () => {
				expect(isVueRouterContent("const routes: RouteRecordRaw[] = []")).toBe(
					true,
				)
			})

			it("should detect vue-router import", () => {
				expect(
					isVueRouterContent('import { createRouter } from "vue-router"'),
				).toBe(true)
			})

			it("should detect .vue file imports", () => {
				expect(
					isVueRouterContent('component: () => import("./views/Home.vue")'),
				).toBe(true)
			})

			it("should return false for React Router content", () => {
				expect(
					isVueRouterContent("const router = createBrowserRouter([])"),
				).toBe(false)
			})
		})

		describe("detectRouterType", () => {
			it("should detect react-router", () => {
				expect(detectRouterType("const router = createBrowserRouter([])")).toBe(
					"react-router",
				)
			})

			it("should detect vue-router", () => {
				expect(
					detectRouterType('import type { RouteRecordRaw } from "vue-router"'),
				).toBe("vue-router")
			})

			it("should return unknown for ambiguous content", () => {
				expect(detectRouterType("const routes = []")).toBe("unknown")
			})
		})
	})
})
