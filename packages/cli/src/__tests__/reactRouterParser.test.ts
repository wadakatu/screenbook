import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
	clearImportedRoutesCache,
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
		clearImportedRoutesCache()
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
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/dashboard")
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
				expect(result.routes[0]?.path).toBe("/")
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

			it("should parse const routes = [...] without export", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const routes = [
  { path: "/", element: <Home /> },
  { path: "/about", element: <About /> },
]

const router = createBrowserRouter(routes)
`,
				)

				const result = parseReactRouterConfig(routesFile)
				// Should find routes from createBrowserRouter call
				expect(result.routes.length).toBeGreaterThan(0)
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
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[0]?.component).toBe("Home")
				expect(result.routes[1]?.path).toBe("/dashboard")
				expect(result.routes[1]?.component).toBe("Dashboard")
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
				expect(result.routes[0]?.component).toBe("Home")
				expect(result.routes[1]?.component).toBe("Dashboard")
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
				expect(result.routes[0]?.component).toBe("Home")
				expect(result.routes[1]?.component).toBe("Dashboard")
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
				expect(result.routes[0]?.component).toContain("pages/Home")
				expect(result.routes[1]?.component).toContain("pages/Dashboard")
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
				expect(result.routes[0]?.component).toBe("Layout.Home")
			})

			it("should extract outermost component from wrapper elements", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const router = createBrowserRouter([
  { path: "/", element: <Layout><Home /></Layout> },
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes[0]?.component).toBe("Layout")
			})

			it("should return undefined for JSXFragment", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const router = createBrowserRouter([
  { path: "/", element: <><Home /></> },
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes[0]?.component).toBeUndefined()
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
				expect(result.routes[0]?.children).toHaveLength(2)
				expect(result.routes[0]?.children?.[0]?.path).toBe("")
				expect(result.routes[0]?.children?.[1]?.path).toBe("dashboard")
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
				expect(flat[0]?.fullPath).toBe("/dashboard")
				expect(flat[1]?.fullPath).toBe("/dashboard")
				expect(flat[2]?.fullPath).toBe("/dashboard/settings")
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
				expect(result.routes[0]?.children).toHaveLength(2)
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
				expect(flat[0]?.fullPath).toBe("/user/:id")
				expect(flat[1]?.fullPath).toBe("/user/:id/profile")
				expect(flat[2]?.fullPath).toBe("/user/:id/settings")
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
				expect(flat[0]?.fullPath).toBe("/admin")
				expect(flat[1]?.fullPath).toBe("/admin/users")
				expect(flat[2]?.fullPath).toBe("/admin/users/:id")
			})
		})

		describe("edge cases", () => {
			it("should resolve spread operator and add informational warning", () => {
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
				// Spread should be resolved, so we get both routes
				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/other")

				// Should have a spread warning with resolved: true
				const spreadWarning = result.warnings.find((w) => w.type === "spread")
				expect(spreadWarning).toBeDefined()
				expect(spreadWarning?.message).toContain("Spread operator")
				expect(spreadWarning?.resolved).toBe(true)
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
				expect(flat[0]?.fullPath).toBe("/")
				expect(flat[1]?.fullPath).toBe("/")
				expect(flat[2]?.fullPath).toBe("/about")
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

				expect(flat[0]?.screenId).toBe("user.id")
				expect(flat[1]?.screenId).toBe("post.postId.comment.commentId")
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

				expect(flat[0]?.screenId).toBe("docs.catchall")
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
				expect(result.warnings[0]?.type).toBe("general")
				expect(result.warnings[0]?.message).toContain("No routes found")
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

		describe("spread operator resolution - local variables", () => {
			it("should resolve spread of local variable with routes", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const adminRoutes = [
  { path: "/admin", element: <Admin /> },
  { path: "/admin/users", element: <AdminUsers /> },
]

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  ...adminRoutes,
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(3)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/admin")
				expect(result.routes[2]?.path).toBe("/admin/users")

				const spreadWarning = result.warnings.find((w) => w.type === "spread")
				expect(spreadWarning?.resolved).toBe(true)
			})

			it("should resolve spread of local variable defined after routes", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  ...devRoutes,
])

const devRoutes = [
  { path: "/dev", element: <DevTools /> },
]
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/dev")
			})

			it("should resolve nested spreads in local variables", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const innerRoutes = [
  { path: "/inner", element: <Inner /> },
]

const outerRoutes = [
  { path: "/outer", element: <Outer /> },
  ...innerRoutes,
]

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  ...outerRoutes,
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(3)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/outer")
				expect(result.routes[2]?.path).toBe("/inner")
			})
		})

		describe("spread operator resolution - conditional expressions", () => {
			it("should resolve ternary with array on true branch", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const isDev = process.env.NODE_ENV === 'development'

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  ...(isDev ? [{ path: "/dev", element: <DevTools /> }] : []),
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/dev")
			})

			it("should resolve ternary with variable on false branch", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const prodRoutes = [
  { path: "/prod", element: <ProdPage /> },
]

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  ...(false ? [] : prodRoutes),
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/prod")
			})

			it("should merge routes from both branches of conditional", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const devRoutes = [{ path: "/dev", element: <Dev /> }]
const prodRoutes = [{ path: "/prod", element: <Prod /> }]

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  ...(import.meta.env.PROD ? prodRoutes : devRoutes),
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				// Should include both branches
				expect(result.routes).toHaveLength(3)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/prod")
				expect(result.routes[2]?.path).toBe("/dev")
			})
		})

		describe("spread operator resolution - logical expressions", () => {
			it("should resolve && operator with right operand", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const devRoutes = [{ path: "/dev", element: <Dev /> }]

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  ...(process.env.NODE_ENV === 'development' && devRoutes),
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/dev")
			})

			it("should resolve || operator with both operands", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const primaryRoutes = [{ path: "/primary", element: <Primary /> }]
const fallbackRoutes = [{ path: "/fallback", element: <Fallback /> }]

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  ...(primaryRoutes || fallbackRoutes),
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				// Should include both operands
				expect(result.routes).toHaveLength(3)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/primary")
				expect(result.routes[2]?.path).toBe("/fallback")
			})
		})

		describe("spread operator resolution - imported routes", () => {
			it("should resolve spread from named import", () => {
				const adminRoutesFile = join(TEST_DIR, "admin-routes.ts")
				writeFileSync(
					adminRoutesFile,
					`
export const adminRoutes = [
  { path: "/admin", element: <Admin /> },
  { path: "/admin/dashboard", element: <AdminDashboard /> },
]
`,
				)

				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { adminRoutes } from "./admin-routes"

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  ...adminRoutes,
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(3)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/admin")
				expect(result.routes[2]?.path).toBe("/admin/dashboard")

				const spreadWarning = result.warnings.find((w) => w.type === "spread")
				expect(spreadWarning?.resolved).toBe(true)
			})

			it("should resolve spread from multiple imported files", () => {
				const adminRoutesFile = join(TEST_DIR, "admin-routes.ts")
				writeFileSync(
					adminRoutesFile,
					`
export const adminRoutes = [{ path: "/admin", element: <Admin /> }]
`,
				)

				const publicRoutesFile = join(TEST_DIR, "public-routes.ts")
				writeFileSync(
					publicRoutesFile,
					`
export const publicRoutes = [{ path: "/public", element: <Public /> }]
`,
				)

				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { adminRoutes } from "./admin-routes"
import { publicRoutes } from "./public-routes"

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  ...adminRoutes,
  ...publicRoutes,
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(3)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/admin")
				expect(result.routes[2]?.path).toBe("/public")
			})

			it("should cache imported routes and reuse them", () => {
				const sharedRoutesFile = join(TEST_DIR, "shared-routes.ts")
				writeFileSync(
					sharedRoutesFile,
					`
export const sharedRoutes = [{ path: "/shared", element: <Shared /> }]
`,
				)

				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { sharedRoutes } from "./shared-routes"

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  ...sharedRoutes,
])
`,
				)

				// Parse twice
				const result1 = parseReactRouterConfig(routesFile)
				const result2 = parseReactRouterConfig(routesFile)

				expect(result1.routes).toHaveLength(2)
				expect(result2.routes).toHaveLength(2)
				// Both should succeed (using cache on second call)
				expect(result1.routes[1]?.path).toBe("/shared")
				expect(result2.routes[1]?.path).toBe("/shared")
			})
		})

		describe("spread operator resolution - unresolvable cases", () => {
			it("should warn for function call results", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
function getRoutes() {
  return [{ path: "/dynamic", element: <Dynamic /> }]
}

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  ...getRoutes(),
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)

				const spreadWarning = result.warnings.find((w) => w.type === "spread")
				expect(spreadWarning?.resolved).toBe(false)
				expect(spreadWarning?.resolutionFailureReason).toContain(
					"Function call results cannot be statically resolved",
				)
			})

			it("should warn for undefined variables", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  ...undefinedRoutes,
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)

				const spreadWarning = result.warnings.find((w) => w.type === "spread")
				expect(spreadWarning?.resolved).toBe(false)
				expect(spreadWarning?.resolutionFailureReason).toContain(
					"not found in local scope or imports",
				)
			})

			it("should handle non-existent imported route files gracefully", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { missingRoutes } from "./non-existent-routes"

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  ...missingRoutes,
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)

				const spreadWarning = result.warnings.find((w) => w.type === "spread")
				expect(spreadWarning?.resolved).toBe(false)

				const generalWarning = result.warnings.find(
					(w) => w.type === "general" && w.message.includes("Could not find"),
				)
				expect(generalWarning).toBeDefined()
			})

			it("should handle syntax errors in imported route files gracefully", () => {
				const brokenRoutesFile = join(TEST_DIR, "broken-routes.ts")
				writeFileSync(
					brokenRoutesFile,
					`
export const brokenRoutes = [
  { path: "/broken"
]
`,
				)

				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { brokenRoutes } from "./broken-routes"

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  ...brokenRoutes,
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)

				const syntaxWarning = result.warnings.find(
					(w) => w.type === "general" && w.message.includes("Syntax error"),
				)
				expect(syntaxWarning).toBeDefined()
			})

			it("should warn when imported variable not exported in file", () => {
				const missingExportFile = join(TEST_DIR, "missing-export.ts")
				writeFileSync(
					missingExportFile,
					`
// wrongRoutes is defined but not exported
const wrongRoutes = [{ path: "/wrong", element: <Wrong /> }]

// otherStuff is not a route array
const otherStuff = "hello"
`,
				)

				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { adminRoutes } from "./missing-export"

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  ...adminRoutes,
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)

				// Should have a warning about not finding the export
				const notFoundWarning = result.warnings.find(
					(w) => w.type === "general" && w.message.includes("not found"),
				)
				expect(notFoundWarning).toBeDefined()
				expect(notFoundWarning?.message).toContain("adminRoutes")
			})

			it("should hint about route naming heuristic for non-route imports", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { pages } from "./pages"

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  ...pages,
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)

				const spreadWarning = result.warnings.find((w) => w.type === "spread")
				expect(spreadWarning?.resolved).toBe(false)
				expect(spreadWarning?.resolutionFailureReason).toContain(
					"Only imports with 'route' in the name are tracked",
				)
			})
		})

		describe("spread operator resolution - depth limiting", () => {
			it("should warn when maximum import depth is reached", () => {
				// Create a chain of imports: level5 -> level4 -> level3 -> level2 -> level1
				const level1File = join(TEST_DIR, "level1-routes.ts")
				writeFileSync(
					level1File,
					`
export const level1Routes = [{ path: "/level1", element: <Level1 /> }]
`,
				)

				const level2File = join(TEST_DIR, "level2-routes.ts")
				writeFileSync(
					level2File,
					`
import { level1Routes } from "./level1-routes"
export const level2Routes = [...level1Routes, { path: "/level2", element: <Level2 /> }]
`,
				)

				const level3File = join(TEST_DIR, "level3-routes.ts")
				writeFileSync(
					level3File,
					`
import { level2Routes } from "./level2-routes"
export const level3Routes = [...level2Routes, { path: "/level3", element: <Level3 /> }]
`,
				)

				const level4File = join(TEST_DIR, "level4-routes.ts")
				writeFileSync(
					level4File,
					`
import { level3Routes } from "./level3-routes"
export const level4Routes = [...level3Routes, { path: "/level4", element: <Level4 /> }]
`,
				)

				const level5File = join(TEST_DIR, "level5-routes.ts")
				writeFileSync(
					level5File,
					`
import { level4Routes } from "./level4-routes"
export const level5Routes = [...level4Routes, { path: "/level5", element: <Level5 /> }]
`,
				)

				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { level5Routes } from "./level5-routes"

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  ...level5Routes,
])
`,
				)

				const result = parseReactRouterConfig(routesFile)

				// Should have some routes but not all due to depth limiting
				expect(result.routes.length).toBeGreaterThan(1)

				// Should have a warning about max depth
				const depthWarning = result.warnings.find(
					(w) =>
						w.type === "general" && w.message.includes("Maximum import depth"),
				)
				expect(depthWarning).toBeDefined()
			})
		})

		describe("spread operator resolution - children routes", () => {
			it("should resolve spread in children routes", () => {
				const childRoutes = join(TEST_DIR, "child-routes.ts")
				writeFileSync(
					childRoutes,
					`
export const dashboardChildRoutes = [
  { path: "analytics", element: <Analytics /> },
  { path: "reports", element: <Reports /> },
]
`,
				)

				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { dashboardChildRoutes } from "./child-routes"

const router = createBrowserRouter([
  {
    path: "/dashboard",
    element: <DashboardLayout />,
    children: [
      { path: "", element: <DashboardHome /> },
      ...dashboardChildRoutes,
    ],
  },
])
`,
				)

				const result = parseReactRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
				expect(result.routes[0]?.children).toHaveLength(3)
				expect(result.routes[0]?.children?.[0]?.path).toBe("")
				expect(result.routes[0]?.children?.[1]?.path).toBe("analytics")
				expect(result.routes[0]?.children?.[2]?.path).toBe("reports")
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

			it("should detect tanstack-router", () => {
				expect(
					detectRouterType(
						'import { createRoute } from "@tanstack/react-router"',
					),
				).toBe("tanstack-router")
			})

			it("should detect tanstack-router with createRootRoute", () => {
				expect(detectRouterType("const rootRoute = createRootRoute({})")).toBe(
					"tanstack-router",
				)
			})

			it("should detect tanstack-router with addChildren", () => {
				expect(detectRouterType("rootRoute.addChildren([indexRoute])")).toBe(
					"tanstack-router",
				)
			})

			it("should return unknown for ambiguous content", () => {
				expect(detectRouterType("const routes = []")).toBe("unknown")
			})
		})
	})
})
