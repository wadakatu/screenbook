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
	// Issue #169: Directory name (PageProjects) differs from route path (/projects)
	// This tests that the correct route is extracted from Vue Router config
	{
		path: "/projects",
		name: "projects",
		component: () => import("../views/PageProjects/index.vue"),
	},
	// Issue #171: Title containing slash to test Mermaid graph escaping
	{
		path: "/admin/dashboard",
		name: "admin-dashboard",
		component: () => import("../views/AdminDashboard/index.vue"),
	},
]
