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

const rootRoute = createRootRoute({
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

const devDebugRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dev/debug",
	component: DevDebug,
})

const routeTree = rootRoute.addChildren([
	indexRoute,
	dashboardRoute,
	settingsRoute,
	userRoute.addChildren([userProfileRoute]),
	adminRoute.addChildren([adminSettingsRoute]),
	devDebugRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router
	}
}
