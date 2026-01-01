import type { RouteRecordRaw } from "vue-router"

export const routes: RouteRecordRaw[] = [
	{
		path: "/",
		name: "home",
		component: () => import("../views/Home/index.vue"),
	},
	{
		path: "/dashboard",
		name: "dashboard",
		component: () => import("../views/Dashboard/index.vue"),
	},
	{
		path: "/settings",
		name: "settings",
		component: () => import("../views/Settings/index.vue"),
	},
	{
		path: "/user/:id",
		name: "user",
		component: () => import("../views/User/index.vue"),
		children: [
			{
				path: "profile",
				name: "user-profile",
				component: () => import("../views/UserProfile/index.vue"),
			},
		],
	},
]
