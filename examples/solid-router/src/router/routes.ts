import type { RouteDefinition } from "@solidjs/router"
import { lazy } from "solid-js"

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
]
