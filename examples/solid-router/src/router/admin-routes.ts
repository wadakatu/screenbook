import type { RouteDefinition } from "@solidjs/router"
import { lazy } from "solid-js"

export const adminRoutes: RouteDefinition[] = [
	{
		path: "/admin",
		component: lazy(() => import("../pages/Admin/index")),
	},
	{
		path: "/admin/settings",
		component: lazy(() => import("../pages/Admin/Settings/index")),
	},
]
