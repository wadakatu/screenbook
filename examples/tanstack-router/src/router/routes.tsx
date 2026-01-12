import {
	createRootRoute,
	createRoute,
	createRouter,
} from "@tanstack/react-router"
import { RootLayout } from "../layouts/RootLayout"
import { Admin } from "../pages/Admin"
import { AdminSettings } from "../pages/Admin/Settings"
import { Dashboard } from "../pages/Dashboard"
import { DevDebug } from "../pages/Dev/Debug"
import { Home } from "../pages/Home"
import { Settings } from "../pages/Settings"
import { User } from "../pages/User"
import { UserProfile } from "../pages/User/Profile"
// Import route arrays for screenbook's spread operator resolution
import { adminRoutes } from "./admin-routes"
import { devRoutes } from "./dev-routes"

export const rootRoute = createRootRoute({
	component: RootLayout,
})

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: Home,
})

const dashboardRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard",
	component: Dashboard,
})

const settingsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/settings",
	component: Settings,
})

const userRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/users/$userId",
	component: User,
})

const userProfileRoute = createRoute({
	getParentRoute: () => userRoute,
	path: "profile",
	component: UserProfile,
})

// Admin routes (defined inline for TanStack Router runtime)
const adminRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/admin",
	component: Admin,
})

const adminSettingsRoute = createRoute({
	getParentRoute: () => adminRoute,
	path: "settings",
	component: AdminSettings,
})

// Dev routes (defined inline for TanStack Router runtime)
const devDebugRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dev/debug",
	component: DevDebug,
})

// Route tree with spread operators for screenbook's static analysis
// The spread operators allow screenbook to detect routes from external files
// Note: Cast to any for TypeScript compatibility (screenbook analyzes the AST)
const routeTree = rootRoute.addChildren([
	indexRoute,
	dashboardRoute,
	settingsRoute,
	userRoute.addChildren([userProfileRoute]),
	adminRoute.addChildren([adminSettingsRoute]),
	devDebugRoute,
	// Spread operators for screenbook analysis (cast to any for TS compatibility)
	// biome-ignore lint/suspicious/noExplicitAny: Intentional cast for screenbook demonstration
	...(adminRoutes as any),
	// biome-ignore lint/suspicious/noExplicitAny: Intentional cast for screenbook demonstration
	...(devRoutes as any),
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router
	}
}
