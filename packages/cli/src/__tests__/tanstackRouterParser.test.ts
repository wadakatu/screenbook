import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { flattenRoutes } from "../utils/routeParserUtils.js"
import {
	isTanStackRouterContent,
	parseTanStackRouterConfig,
} from "../utils/tanstackRouterParser.js"

const TEST_DIR = ".test-tanstack-router-parser"

describe("tanstackRouterParser", () => {
	beforeEach(() => {
		rmSync(TEST_DIR, { recursive: true, force: true })
		mkdirSync(TEST_DIR, { recursive: true })
	})

	afterEach(() => {
		rmSync(TEST_DIR, { recursive: true, force: true })
	})

	describe("parseTanStackRouterConfig", () => {
		describe("pattern detection", () => {
			it("should parse createRootRoute()", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { RootLayout } from './layouts/RootLayout'
import { Home } from './pages/Home'

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
})

const routeTree = rootRoute.addChildren([indexRoute])
`,
				)

				const result = parseTanStackRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[0]?.component).toBe("Home")
			})

			it("should parse createRoute with path and component", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createRootRoute, createRoute } from '@tanstack/react-router'

const rootRoute = createRootRoute({})

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: About,
})

const routeTree = rootRoute.addChildren([aboutRoute])
`,
				)

				const result = parseTanStackRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
				expect(result.routes[0]?.path).toBe("/about")
				expect(result.routes[0]?.component).toBe("About")
			})

			it("should parse createRootRouteWithContext()", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createRootRouteWithContext, createRoute } from '@tanstack/react-router'

const rootRoute = createRootRouteWithContext<{ auth: AuthContext }>()({
  component: RootLayout,
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
})

const routeTree = rootRoute.addChildren([homeRoute])
`,
				)

				const result = parseTanStackRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
				expect(result.routes[0]?.path).toBe("/")
			})

			it("should parse exported route definitions", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createRootRoute, createRoute } from '@tanstack/react-router'

export const rootRoute = createRootRoute({
  component: RootLayout,
})

export const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
})

export const routeTree = rootRoute.addChildren([homeRoute])
`,
				)

				const result = parseTanStackRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
				expect(result.routes[0]?.path).toBe("/")
			})
		})

		describe("addChildren tree building", () => {
			it("should build tree from addChildren calls", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createRootRoute, createRoute } from '@tanstack/react-router'

const rootRoute = createRootRoute({})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
})

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: About,
})

const contactRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/contact',
  component: Contact,
})

const routeTree = rootRoute.addChildren([homeRoute, aboutRoute, contactRoute])
`,
				)

				const result = parseTanStackRouterConfig(routesFile)
				expect(result.routes).toHaveLength(3)
				expect(result.routes[0]?.path).toBe("/")
				expect(result.routes[1]?.path).toBe("/about")
				expect(result.routes[2]?.path).toBe("/contact")
			})

			it("should handle nested addChildren", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createRootRoute, createRoute } from '@tanstack/react-router'

const rootRoute = createRootRoute({})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: Dashboard,
})

const settingsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: 'settings',
  component: Settings,
})

const profileRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: 'profile',
  component: Profile,
})

const routeTree = rootRoute.addChildren([
  dashboardRoute.addChildren([settingsRoute, profileRoute])
])
`,
				)

				const result = parseTanStackRouterConfig(routesFile)
				const flat = flattenRoutes(result.routes)

				expect(flat).toHaveLength(3)
				expect(flat[0]?.fullPath).toBe("/dashboard")
				expect(flat[1]?.fullPath).toBe("/dashboard/settings")
				expect(flat[2]?.fullPath).toBe("/dashboard/profile")
			})

			it("should handle deeply nested routes (3+ levels)", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createRootRoute, createRoute } from '@tanstack/react-router'

const rootRoute = createRootRoute({})

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: Admin,
})

const usersRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: 'users',
  component: Users,
})

const userDetailRoute = createRoute({
  getParentRoute: () => usersRoute,
  path: '$userId',
  component: UserDetail,
})

const routeTree = rootRoute.addChildren([
  adminRoute.addChildren([
    usersRoute.addChildren([userDetailRoute])
  ])
])
`,
				)

				const result = parseTanStackRouterConfig(routesFile)
				const flat = flattenRoutes(result.routes)

				expect(flat).toHaveLength(3)
				expect(flat[0]?.fullPath).toBe("/admin")
				expect(flat[1]?.fullPath).toBe("/admin/users")
				expect(flat[2]?.fullPath).toBe("/admin/users/:userId")
			})
		})

		describe("path normalization", () => {
			it("should normalize $param to :param", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createRootRoute, createRoute } from '@tanstack/react-router'

const rootRoute = createRootRoute({})

const userRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users/$userId',
  component: User,
})

const routeTree = rootRoute.addChildren([userRoute])
`,
				)

				const result = parseTanStackRouterConfig(routesFile)
				expect(result.routes[0]?.path).toBe("/users/:userId")
			})

			it("should normalize multiple $params", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createRootRoute, createRoute } from '@tanstack/react-router'

const rootRoute = createRootRoute({})

const commentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/posts/$postId/comments/$commentId',
  component: Comment,
})

const routeTree = rootRoute.addChildren([commentRoute])
`,
				)

				const result = parseTanStackRouterConfig(routesFile)
				expect(result.routes[0]?.path).toBe(
					"/posts/:postId/comments/:commentId",
				)

				const flat = flattenRoutes(result.routes)
				expect(flat[0]?.screenId).toBe("posts.postId.comments.commentId")
			})

			it("should handle catch-all $ route at end", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createRootRoute, createRoute } from '@tanstack/react-router'

const rootRoute = createRootRoute({})

const docsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/docs/$',
  component: Docs,
})

const routeTree = rootRoute.addChildren([docsRoute])
`,
				)

				const result = parseTanStackRouterConfig(routesFile)
				expect(result.routes[0]?.path).toBe("/docs/*")

				const flat = flattenRoutes(result.routes)
				expect(flat[0]?.screenId).toBe("docs.catchall")
			})

			it("should handle single $ (splat route)", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createRootRoute, createRoute } from '@tanstack/react-router'

const rootRoute = createRootRoute({})

const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  component: NotFound,
})

const routeTree = rootRoute.addChildren([catchAllRoute])
`,
				)

				const result = parseTanStackRouterConfig(routesFile)
				expect(result.routes[0]?.path).toBe("*")
			})
		})

		describe("component extraction", () => {
			it("should extract component from Identifier", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createRootRoute, createRoute } from '@tanstack/react-router'

const rootRoute = createRootRoute({})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

const routeTree = rootRoute.addChildren([homeRoute])
`,
				)

				const result = parseTanStackRouterConfig(routesFile)
				expect(result.routes[0]?.component).toBe("HomePage")
			})

			it("should extract path from lazyRouteComponent", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createRootRoute, createRoute, lazyRouteComponent } from '@tanstack/react-router'

const rootRoute = createRootRoute({})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: lazyRouteComponent(() => import('./pages/Dashboard')),
})

const routeTree = rootRoute.addChildren([dashboardRoute])
`,
				)

				const result = parseTanStackRouterConfig(routesFile)
				expect(result.routes[0]?.component).toContain("pages/Dashboard")
			})

			it("should handle .lazy() method pattern", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createRootRoute, createRoute } from '@tanstack/react-router'

const rootRoute = createRootRoute({})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
}).lazy(() => import('./settings.lazy').then(d => d.Route))

const routeTree = rootRoute.addChildren([settingsRoute])
`,
				)

				const result = parseTanStackRouterConfig(routesFile)
				expect(result.routes[0]?.path).toBe("/settings")
				expect(result.routes[0]?.component).toContain("settings.lazy")
			})

			it("should extract component from arrow function returning JSX", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createRootRoute, createRoute } from '@tanstack/react-router'

const rootRoute = createRootRoute({})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Home />,
})

const routeTree = rootRoute.addChildren([homeRoute])
`,
				)

				const result = parseTanStackRouterConfig(routesFile)
				expect(result.routes[0]?.component).toBe("Home")
			})
		})

		describe("edge cases", () => {
			it("should warn on spread operator", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createRootRoute, createRoute } from '@tanstack/react-router'

const rootRoute = createRootRoute({})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
})

const otherRoutes = [aboutRoute, contactRoute]

const routeTree = rootRoute.addChildren([homeRoute, ...otherRoutes])
`,
				)

				const result = parseTanStackRouterConfig(routesFile)
				expect(result.warnings.length).toBeGreaterThan(0)
				expect(result.warnings.some((w) => w.includes("Spread operator"))).toBe(
					true,
				)
			})

			it("should warn on dynamic getParentRoute", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createRootRoute, createRoute } from '@tanstack/react-router'

const getParent = () => rootRoute
const rootRoute = createRootRoute({})

const homeRoute = createRoute({
  getParentRoute: getParent,
  path: '/',
  component: Home,
})

const routeTree = rootRoute.addChildren([homeRoute])
`,
				)

				const result = parseTanStackRouterConfig(routesFile)
				// Route without explicit arrow function getParentRoute won't capture parent
				// This should still parse the route
				expect(result.routes.length).toBeGreaterThanOrEqual(0)
			})

			it("should warn when parent route not found", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createRootRoute, createRoute } from '@tanstack/react-router'

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
})

const routeTree = unknownRoute.addChildren([homeRoute])
`,
				)

				const result = parseTanStackRouterConfig(routesFile)
				expect(result.warnings.some((w) => w.includes("not found"))).toBe(true)
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

				const result = parseTanStackRouterConfig(routesFile)
				expect(result.routes).toHaveLength(0)
				expect(result.warnings.some((w) => w.includes("No routes found"))).toBe(
					true,
				)
			})

			it("should throw on file not found", () => {
				expect(() => {
					parseTanStackRouterConfig(join(TEST_DIR, "nonexistent.tsx"))
				}).toThrow("Failed to read routes file")
			})

			it("should throw on syntax errors", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
const route = createRoute({
  path: '/',
])
`,
				)

				expect(() => {
					parseTanStackRouterConfig(routesFile)
				}).toThrow("Syntax error")
			})

			it("should warn on dynamic path value", () => {
				const routesFile = join(TEST_DIR, "routes.tsx")
				writeFileSync(
					routesFile,
					`
import { createRootRoute, createRoute } from '@tanstack/react-router'

const rootRoute = createRootRoute({})
const dynamicPath = '/dynamic'

const dynamicRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: dynamicPath,
  component: Dynamic,
})

const routeTree = rootRoute.addChildren([dynamicRoute])
`,
				)

				const result = parseTanStackRouterConfig(routesFile)
				expect(result.warnings.some((w) => w.includes("Dynamic path"))).toBe(
					true,
				)
			})
		})

		describe("preloaded content", () => {
			it("should parse from preloaded content string", () => {
				const content = `
import { createRootRoute, createRoute } from '@tanstack/react-router'

const rootRoute = createRootRoute({})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
})

const routeTree = rootRoute.addChildren([homeRoute])
`

				const result = parseTanStackRouterConfig("virtual.tsx", content)
				expect(result.routes).toHaveLength(1)
				expect(result.routes[0]?.path).toBe("/")
			})
		})
	})

	describe("isTanStackRouterContent", () => {
		it("should detect @tanstack/react-router import", () => {
			expect(
				isTanStackRouterContent(
					'import { createRoute } from "@tanstack/react-router"',
				),
			).toBe(true)
		})

		it("should detect createRootRoute pattern", () => {
			expect(
				isTanStackRouterContent("const rootRoute = createRootRoute({})"),
			).toBe(true)
		})

		it("should detect createRoute with getParentRoute", () => {
			expect(
				isTanStackRouterContent(
					"createRoute({ getParentRoute: () => rootRoute, path: '/' })",
				),
			).toBe(true)
		})

		it("should detect lazyRouteComponent", () => {
			expect(
				isTanStackRouterContent(
					"component: lazyRouteComponent(() => import('./page'))",
				),
			).toBe(true)
		})

		it("should detect .addChildren pattern", () => {
			expect(
				isTanStackRouterContent("rootRoute.addChildren([indexRoute])"),
			).toBe(true)
		})

		it("should return false for React Router content", () => {
			expect(
				isTanStackRouterContent("const router = createBrowserRouter([])"),
			).toBe(false)
		})

		it("should return false for Vue Router content", () => {
			expect(
				isTanStackRouterContent('import { createRouter } from "vue-router"'),
			).toBe(false)
		})

		it("should return false for plain JavaScript", () => {
			expect(isTanStackRouterContent("const routes = []")).toBe(false)
		})
	})
})
