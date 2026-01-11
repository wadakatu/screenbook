import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
	clearImportedRoutesCache,
	isAngularRouterContent,
	parseAngularRouterConfig,
} from "../utils/angularRouterParser.js"
import { flattenRoutes, type SpreadWarning } from "../utils/routeParserUtils.js"

const TEST_DIR = ".test-angular-router-parser"

describe("angularRouterParser", () => {
	beforeEach(() => {
		rmSync(TEST_DIR, { recursive: true, force: true })
		mkdirSync(TEST_DIR, { recursive: true })
	})

	afterEach(() => {
		rmSync(TEST_DIR, { recursive: true, force: true })
		clearImportedRoutesCache()
	})

	describe("parseAngularRouterConfig", () => {
		describe("basic patterns", () => {
			it("should parse basic route with path and component", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"
import { HomeComponent } from "./home/home.component"
import { AboutComponent } from "./about/about.component"

export const routes: Routes = [
  { path: "", component: HomeComponent },
  { path: "about", component: AboutComponent },
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("")
				expect(result.routes[0]?.component).toBe("HomeComponent")
				expect(result.routes[1]?.path).toBe("about")
				expect(result.routes[1]?.component).toBe("AboutComponent")
			})

			it("should parse route with loadComponent (Standalone)", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

export const routes: Routes = [
  {
    path: "",
    loadComponent: () => import("./home/home.component").then(m => m.HomeComponent)
  },
  {
    path: "about",
    loadComponent: () => import("./about/about.component").then(m => m.AboutComponent)
  },
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.component).toContain("home/home.component")
				expect(result.routes[0]?.component).toContain("HomeComponent")
				expect(result.routes[1]?.component).toContain("about/about.component")
			})

			it("should parse route with loadComponent without .then() chain", () => {
				const content = `
import { Routes } from "@angular/router"

export const routes: Routes = [
  {
    path: "lazy",
    loadComponent: () => import("./lazy/lazy.component")
  },
]
`
				const result = parseAngularRouterConfig("virtual.ts", content)
				expect(result.routes).toHaveLength(1)
				expect(result.routes[0]?.component).toContain("lazy/lazy.component")
			})

			it("should parse route with loadChildren", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

export const routes: Routes = [
  { path: "", component: HomeComponent },
  {
    path: "admin",
    loadChildren: () => import("./admin/admin.routes").then(m => m.ADMIN_ROUTES)
  },
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(2)
				expect(result.routes[1]?.component).toContain("admin/admin.routes")
			})

			it("should handle nested routes with children", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

export const routes: Routes = [
  {
    path: "dashboard",
    component: DashboardComponent,
    children: [
      { path: "", component: DashboardHomeComponent },
      { path: "settings", component: SettingsComponent },
    ],
  },
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
				expect(result.routes[0]?.path).toBe("dashboard")
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
import { Routes } from "@angular/router"

export const routes: Routes = [
  {
    path: "admin",
    component: AdminLayoutComponent,
    children: [
      {
        path: "users",
        component: UsersLayoutComponent,
        children: [
          { path: ":id", component: UserDetailComponent },
        ],
      },
    ],
  },
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				const flat = flattenRoutes(result.routes)

				expect(flat).toHaveLength(3)
				expect(flat[0]?.fullPath).toBe("/admin")
				expect(flat[1]?.fullPath).toBe("/admin/users")
				expect(flat[2]?.fullPath).toBe("/admin/users/:id")
			})
		})

		describe("Angular Router specific features", () => {
			it("should handle redirect routes", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

export const routes: Routes = [
  { path: "", redirectTo: "home", pathMatch: "full" },
  { path: "home", component: HomeComponent },
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				// Redirect-only routes should be skipped
				expect(result.routes).toHaveLength(1)
				expect(result.routes[0]?.path).toBe("home")
			})

			it("should handle wildcard routes **", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

export const routes: Routes = [
  { path: "", component: HomeComponent },
  { path: "**", component: NotFoundComponent },
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(2)
				expect(result.routes[1]?.path).toBe("**")
				expect(result.routes[1]?.component).toBe("NotFoundComponent")

				const flat = flattenRoutes(result.routes)
				// ** should be treated as catchall
				expect(flat[1]?.screenId).toBe("catchall")
			})

			it("should handle empty path routes", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

export const routes: Routes = [
  { path: "", component: HomeComponent },
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
				expect(result.routes[0]?.path).toBe("")
			})

			it("should extract component from .then(m => m.Component)", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

export const routes: Routes = [
  {
    path: "users",
    loadComponent: () => import("./users/users.component")
      .then(m => m.UsersComponent)
  },
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes[0]?.component).toContain("UsersComponent")
			})
		})

		describe("NgModule pattern", () => {
			it("should extract from RouterModule.forRoot([...])", () => {
				const content = `
import { NgModule } from "@angular/core"
import { RouterModule, Routes } from "@angular/router"

const routes: Routes = [
  { path: "", component: HomeComponent },
  { path: "about", component: AboutComponent },
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
`
				const result = parseAngularRouterConfig("virtual.ts", content)
				expect(result.routes).toHaveLength(2)
			})

			it("should handle inline routes in RouterModule.forRoot", () => {
				const content = `
import { NgModule } from "@angular/core"
import { RouterModule, Routes } from "@angular/router"

@NgModule({
  imports: [RouterModule.forRoot([
    { path: "", component: HomeComponent },
    { path: "about", component: AboutComponent },
  ])],
  exports: [RouterModule]
})
export class AppRoutingModule { }
`
				const result = parseAngularRouterConfig("virtual.ts", content)
				expect(result.routes).toHaveLength(2)
			})

			it("should handle RouterModule.forChild for feature modules", () => {
				const content = `
import { NgModule } from "@angular/core"
import { RouterModule, Routes } from "@angular/router"

const routes: Routes = [
  { path: "", component: FeatureHomeComponent },
  { path: "detail", component: FeatureDetailComponent },
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FeatureRoutingModule { }
`
				const result = parseAngularRouterConfig("virtual.ts", content)
				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("")
				expect(result.routes[1]?.path).toBe("detail")
			})
		})

		describe("path handling", () => {
			it("should handle dynamic segments :param", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

export const routes: Routes = [
  { path: "users/:userId", component: UserComponent },
  { path: "posts/:postId/comments/:commentId", component: CommentComponent },
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes[0]?.path).toBe("users/:userId")
				expect(result.routes[1]?.path).toBe("posts/:postId/comments/:commentId")

				const flat = flattenRoutes(result.routes)
				expect(flat[0]?.screenId).toBe("users.userId")
				expect(flat[1]?.screenId).toBe("posts.postId.comments.commentId")
			})

			it("should skip routes without path", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

export const routes: Routes = [
  { component: LayoutOnlyComponent },
  { path: "about", component: AboutComponent },
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
				expect(result.routes[0]?.path).toBe("about")
			})

			it("should handle layout routes without path but with children", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

export const routes: Routes = [
  {
    component: MainLayoutComponent,
    children: [
      { path: "", component: HomeComponent },
      { path: "about", component: AboutComponent },
    ],
  },
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
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
import { Routes } from "@angular/router"

const otherRoutes: Routes = [{ path: "other", component: OtherComponent }]

export const routes: Routes = [
  { path: "", component: HomeComponent },
  ...otherRoutes,
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
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
import { Routes } from "@angular/router"

const dynamicPath = "dynamic"

export const routes: Routes = [
  { path: dynamicPath, component: DynamicComponent },
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(
					result.warnings.some((w) => w.message.includes("Dynamic path")),
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

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(0)
				expect(
					result.warnings.some((w) => w.message.includes("No routes found")),
				).toBe(true)
			})

			it("should throw on file not found", () => {
				expect(() => {
					parseAngularRouterConfig(join(TEST_DIR, "nonexistent.ts"))
				}).toThrow("Failed to read routes file")
			})

			it("should throw on syntax errors", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
export const routes: Routes = [
  { path: "",
]
`,
				)

				expect(() => {
					parseAngularRouterConfig(routesFile)
				}).toThrow("Syntax error")
			})

			it("should warn on non-object route elements", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

const getRoute = () => ({ path: "dynamic", component: DynamicComponent })

export const routes: Routes = [
  { path: "", component: HomeComponent },
  getRoute(),
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(
					result.warnings.some((w) =>
						w.message.includes("Non-object route element"),
					),
				).toBe(true)
				// Should still parse the static route
				expect(result.routes).toHaveLength(1)
				expect(result.routes[0]?.path).toBe("")
			})

			it("should warn on lazy loadComponent with dynamic import path", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

const componentPath = "./home/home.component"

export const routes: Routes = [
  { path: "", loadComponent: () => import(componentPath).then(m => m.HomeComponent) },
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(
					result.warnings.some((w) =>
						w.message.includes("Lazy loadComponent with dynamic"),
					),
				).toBe(true)
			})

			it("should handle sparse route arrays gracefully", () => {
				const content = `
import { Routes } from "@angular/router"

export const routes: Routes = [
  { path: "", component: HomeComponent },
  ,
  { path: "about", component: AboutComponent },
]
`
				const result = parseAngularRouterConfig("virtual.ts", content)
				expect(result.routes).toHaveLength(2)
				expect(result.warnings).toHaveLength(0)
			})
		})

		describe("export patterns", () => {
			it("should parse export default array", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

export default [
  { path: "", component: HomeComponent },
  { path: "about", component: AboutComponent },
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(2)
			})

			it("should parse export default with satisfies", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import type { Routes } from "@angular/router"

export default [
  { path: "", component: HomeComponent },
] satisfies Routes
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
			})

			it("should parse non-exported routes variable with Routes type", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

const appRoutes: Routes = [
  { path: "", component: HomeComponent },
]

export { appRoutes }
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
			})
		})

		describe("preloaded content", () => {
			it("should parse from preloaded content string", () => {
				const content = `
import { Routes } from "@angular/router"

export const routes: Routes = [
  { path: "", component: HomeComponent },
  { path: "about", component: AboutComponent },
]
`

				const result = parseAngularRouterConfig("virtual.ts", content)
				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("")
			})
		})

		describe("ignored properties", () => {
			it("should ignore canActivate guards", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

export const routes: Routes = [
  {
    path: "admin",
    component: AdminComponent,
    canActivate: [AuthGuard],
  },
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
				expect(result.warnings).toHaveLength(0)
			})

			it("should ignore resolve", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

export const routes: Routes = [
  {
    path: "user/:id",
    component: UserComponent,
    resolve: { user: UserResolver },
  },
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
				expect(result.warnings).toHaveLength(0)
			})

			it("should ignore data", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

export const routes: Routes = [
  {
    path: "about",
    component: AboutComponent,
    data: { title: "About Page" },
  },
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
				expect(result.warnings).toHaveLength(0)
			})
		})

		describe("spread operator resolution - local variables", () => {
			it("should resolve spread of local variable with routes", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

const devRoutes = [
  {
    path: 'dev',
    loadComponent: () => import('./dev/dev.component').then(m => m.DevComponent),
  },
]

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home.component').then(m => m.HomeComponent),
  },
  ...devRoutes,
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)

				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("")
				expect(result.routes[1]?.path).toBe("dev")
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
import { Routes } from "@angular/router"

export const routes: Routes = [
  { path: '', component: HomeComponent },
  ...devRoutes,
]

const devRoutes = [
  { path: 'dev', component: DevComponent },
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("")
				expect(result.routes[1]?.path).toBe("dev")
			})

			it("should resolve nested spreads in local variables", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

const innerRoutes = [
  { path: 'inner', component: InnerComponent },
]

const outerRoutes = [
  { path: 'outer', component: OuterComponent },
  ...innerRoutes,
]

export const routes: Routes = [
  { path: '', component: HomeComponent },
  ...outerRoutes,
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(3)
				expect(result.routes[0]?.path).toBe("")
				expect(result.routes[1]?.path).toBe("outer")
				expect(result.routes[2]?.path).toBe("inner")
			})
		})

		describe("spread operator resolution - conditional expressions", () => {
			it("should resolve ternary with array on true branch", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

const isDev = true

export const routes: Routes = [
  { path: '', component: HomeComponent },
  ...(isDev ? [{ path: 'dev', component: DevComponent }] : []),
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("")
				expect(result.routes[1]?.path).toBe("dev")
			})

			it("should resolve ternary with variable on false branch", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

const prodRoutes = [
  { path: 'prod', component: ProdComponent },
]

export const routes: Routes = [
  { path: '', component: HomeComponent },
  ...(false ? [] : prodRoutes),
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("")
				expect(result.routes[1]?.path).toBe("prod")
			})

			it("should merge routes from both branches of conditional", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

const devRoutes = [{ path: 'dev', component: DevComponent }]
const prodRoutes = [{ path: 'prod', component: ProdComponent }]

export const routes: Routes = [
  { path: '', component: HomeComponent },
  ...(process.env.PROD ? prodRoutes : devRoutes),
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				// Should include both branches
				expect(result.routes).toHaveLength(3)
				expect(result.routes[0]?.path).toBe("")
				expect(result.routes[1]?.path).toBe("prod")
				expect(result.routes[2]?.path).toBe("dev")
			})
		})

		describe("spread operator resolution - logical expressions", () => {
			it("should resolve && operator with right operand", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

const devRoutes = [{ path: 'dev', component: DevComponent }]

export const routes: Routes = [
  { path: '', component: HomeComponent },
  ...(process.env.NODE_ENV === 'development' && devRoutes),
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(2)
				expect(result.routes[0]?.path).toBe("")
				expect(result.routes[1]?.path).toBe("dev")
			})

			it("should resolve || operator with both operands", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

const primaryRoutes = [{ path: 'primary', component: PrimaryComponent }]
const fallbackRoutes = [{ path: 'fallback', component: FallbackComponent }]

export const routes: Routes = [
  { path: '', component: HomeComponent },
  ...(primaryRoutes || fallbackRoutes),
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				// Should include both operands
				expect(result.routes).toHaveLength(3)
				expect(result.routes[0]?.path).toBe("")
				expect(result.routes[1]?.path).toBe("primary")
				expect(result.routes[2]?.path).toBe("fallback")
			})
		})

		describe("spread operator resolution - imported routes", () => {
			it("should resolve spread from named import", () => {
				const adminRoutesFile = join(TEST_DIR, "admin-routes.ts")
				writeFileSync(
					adminRoutesFile,
					`
export const adminRoutes = [
  { path: 'admin', component: AdminComponent },
  { path: 'admin/dashboard', component: AdminDashboardComponent },
]
`,
				)

				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"
import { adminRoutes } from "./admin-routes"

export const routes: Routes = [
  { path: '', component: HomeComponent },
  ...adminRoutes,
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(3)
				expect(result.routes[0]?.path).toBe("")
				expect(result.routes[1]?.path).toBe("admin")
				expect(result.routes[2]?.path).toBe("admin/dashboard")

				const spreadWarning = result.warnings.find((w) => w.type === "spread")
				expect(spreadWarning?.resolved).toBe(true)
			})

			it("should resolve spread from multiple imported files", () => {
				const adminRoutesFile = join(TEST_DIR, "admin-routes.ts")
				writeFileSync(
					adminRoutesFile,
					`
export const adminRoutes = [
  { path: 'admin', component: AdminComponent },
]
`,
				)

				const userRoutesFile = join(TEST_DIR, "user-routes.ts")
				writeFileSync(
					userRoutesFile,
					`
export const userRoutes = [
  { path: 'user', component: UserComponent },
]
`,
				)

				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"
import { adminRoutes } from "./admin-routes"
import { userRoutes } from "./user-routes"

export const routes: Routes = [
  { path: '', component: HomeComponent },
  ...adminRoutes,
  ...userRoutes,
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(3)
				expect(result.routes[0]?.path).toBe("")
				expect(result.routes[1]?.path).toBe("admin")
				expect(result.routes[2]?.path).toBe("user")
			})

			it("should cache imported routes and reuse them", () => {
				const adminRoutesFile = join(TEST_DIR, "admin-routes.ts")
				writeFileSync(
					adminRoutesFile,
					`
export const adminRoutes = [
  { path: 'admin', component: AdminComponent },
]
`,
				)

				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"
import { adminRoutes } from "./admin-routes"

export const routes: Routes = [
  { path: '', component: HomeComponent },
  ...adminRoutes,
]
`,
				)

				// First parse
				const result1 = parseAngularRouterConfig(routesFile)
				expect(result1.routes).toHaveLength(2)

				// Second parse should use cache
				const result2 = parseAngularRouterConfig(routesFile)
				expect(result2.routes).toHaveLength(2)
			})
		})

		describe("spread operator resolution - unresolvable cases", () => {
			it("should warn for function call results", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

function getRoutes() {
  return [{ path: 'dynamic', component: DynamicComponent }]
}

export const routes: Routes = [
  { path: '', component: HomeComponent },
  ...getRoutes(),
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
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
import { Routes } from "@angular/router"

export const routes: Routes = [
  { path: '', component: HomeComponent },
  ...undefinedRoutes,
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)

				const spreadWarning = result.warnings.find(
					(w) => w.type === "spread",
				) as SpreadWarning | undefined
				expect(spreadWarning?.resolved).toBe(false)
				expect(spreadWarning?.resolutionFailureReason).toContain(
					"not found in local scope or imports",
				)
			})

			it("should hint about route naming heuristic for non-route imports", () => {
				const pagesFile = join(TEST_DIR, "pages.ts")
				writeFileSync(
					pagesFile,
					`
export const pages = [
  { path: 'page', component: PageComponent },
]
`,
				)

				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"
import { pages } from "./pages"

export const routes: Routes = [
  { path: '', component: HomeComponent },
  ...pages,
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)

				const spreadWarning = result.warnings.find(
					(w) => w.type === "spread",
				) as SpreadWarning | undefined
				expect(spreadWarning?.resolved).toBe(false)
				expect(spreadWarning?.resolutionFailureReason).toContain(
					"Only imports with 'route' in the name are tracked",
				)
			})
		})

		describe("spread operator resolution - depth limiting", () => {
			it("should warn when maximum import depth is reached", () => {
				// Create deeply nested imports
				const level3File = join(TEST_DIR, "level3-routes.ts")
				writeFileSync(
					level3File,
					`
export const level3Routes = [
  { path: 'level3', component: Level3Component },
]
`,
				)

				const level2File = join(TEST_DIR, "level2-routes.ts")
				writeFileSync(
					level2File,
					`
import { level3Routes } from "./level3-routes"

export const level2Routes = [
  { path: 'level2', component: Level2Component },
  ...level3Routes,
]
`,
				)

				const level1File = join(TEST_DIR, "level1-routes.ts")
				writeFileSync(
					level1File,
					`
import { level2Routes } from "./level2-routes"

export const level1Routes = [
  { path: 'level1', component: Level1Component },
  ...level2Routes,
]
`,
				)

				const level0File = join(TEST_DIR, "level0-routes.ts")
				writeFileSync(
					level0File,
					`
import { level1Routes } from "./level1-routes"

export const level0Routes = [
  { path: 'level0', component: Level0Component },
  ...level1Routes,
]
`,
				)

				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"
import { level0Routes } from "./level0-routes"

export const routes: Routes = [
  { path: '', component: HomeComponent },
  ...level0Routes,
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)

				// Should have depth warning
				const depthWarning = result.warnings.find((w) =>
					w.message?.includes("Maximum import depth"),
				)
				expect(depthWarning).toBeDefined()
			})
		})

		describe("spread operator resolution - children routes", () => {
			it("should resolve spread in children routes", () => {
				const routesFile = join(TEST_DIR, "routes.ts")
				writeFileSync(
					routesFile,
					`
import { Routes } from "@angular/router"

const childRoutes = [
  { path: 'child1', component: Child1Component },
  { path: 'child2', component: Child2Component },
]

export const routes: Routes = [
  {
    path: 'parent',
    component: ParentComponent,
    children: [
      { path: '', component: ParentIndexComponent },
      ...childRoutes,
    ],
  },
]
`,
				)

				const result = parseAngularRouterConfig(routesFile)
				expect(result.routes).toHaveLength(1)
				expect(result.routes[0]?.path).toBe("parent")
				expect(result.routes[0]?.children).toHaveLength(3)
				expect(result.routes[0]?.children?.[0]?.path).toBe("")
				expect(result.routes[0]?.children?.[1]?.path).toBe("child1")
				expect(result.routes[0]?.children?.[2]?.path).toBe("child2")
			})
		})
	})

	describe("isAngularRouterContent", () => {
		it("should detect @angular/router import", () => {
			expect(
				isAngularRouterContent('import { Routes } from "@angular/router"'),
			).toBe(true)
		})

		it("should detect RouterModule.forRoot pattern", () => {
			expect(isAngularRouterContent("RouterModule.forRoot([])")).toBe(true)
		})

		it("should detect RouterModule.forChild pattern", () => {
			expect(isAngularRouterContent("RouterModule.forChild([])")).toBe(true)
		})

		it("should detect : Routes type annotation", () => {
			expect(isAngularRouterContent("const routes: Routes = []")).toBe(true)
		})

		it("should return false for React Router content", () => {
			expect(
				isAngularRouterContent("const router = createBrowserRouter([])"),
			).toBe(false)
		})

		it("should return false for Vue Router content", () => {
			expect(
				isAngularRouterContent('import { createRouter } from "vue-router"'),
			).toBe(false)
		})

		it("should return false for Solid Router content", () => {
			expect(
				isAngularRouterContent('import { Router } from "@solidjs/router"'),
			).toBe(false)
		})

		it("should return false for TanStack Router content", () => {
			expect(
				isAngularRouterContent(
					'import { createRoute } from "@tanstack/react-router"',
				),
			).toBe(false)
		})

		it("should return false for plain JavaScript", () => {
			expect(isAngularRouterContent("const routes = []")).toBe(false)
		})
	})
})
