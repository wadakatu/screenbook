import {
	createRootRoute,
	createRoute,
	createRouter,
} from "@tanstack/react-router"
import { RootLayout } from "../layouts/RootLayout"
import { Dashboard } from "../pages/Dashboard"
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

const routeTree = rootRoute.addChildren([
	indexRoute,
	dashboardRoute,
	settingsRoute,
	userRoute.addChildren([userProfileRoute]),
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router
	}
}
