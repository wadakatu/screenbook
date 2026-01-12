import type { RouteDefinition } from "@solidjs/router"
import { lazy } from "solid-js"

export const devRoutes: RouteDefinition[] = [
	{
		path: "/dev/debug",
		component: lazy(() => import("../pages/Dev/Debug/index")),
	},
]
