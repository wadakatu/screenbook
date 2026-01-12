import type { RouteDefinition } from "@solidjs/router"
import { lazy } from "solid-js"
import { adminRoutes } from "./admin-routes"
import { devRoutes } from "./dev-routes"

export const routes: RouteDefinition[] = [
	{
		path: "/",
		component: lazy(() => import("../pages/Home/index")),
	},
	{
		path: "/about",
		component: lazy(() => import("../pages/About/index")),
	},
	{
		path: "/dashboard",
		component: lazy(() => import("../pages/Dashboard/index")),
	},
	{
		path: "/user/:userId",
		component: lazy(() => import("../pages/User/index")),
	},
	// Spread operator examples
	...adminRoutes,
	// biome-ignore lint/correctness/noConstantCondition: Intentional for testing spread resolution
	...(true ? devRoutes : []),
]
