import type { Routes } from "@angular/router"

// Admin routes for spread operator resolution example
const adminRoutes = [
	{
		path: "admin",
		loadComponent: () =>
			import("./pages/admin/admin.component").then((m) => m.AdminComponent),
	},
	{
		path: "admin/settings",
		loadComponent: () =>
			import("./pages/admin/settings/settings.component").then(
				(m) => m.SettingsComponent,
			),
	},
]

// Dev routes (conditional spread example)
const devRoutes = [
	{
		path: "dev/debug",
		loadComponent: () =>
			import("./pages/dev/debug/debug.component").then(
				(m) => m.DebugComponent,
			),
	},
]

export const routes: Routes = [
	{
		path: "",
		loadComponent: () =>
			import("./pages/home/home.component").then((m) => m.HomeComponent),
	},
	{
		path: "about",
		loadComponent: () =>
			import("./pages/about/about.component").then((m) => m.AboutComponent),
	},
	{
		path: "dashboard",
		loadComponent: () =>
			import("./pages/dashboard/dashboard.component").then(
				(m) => m.DashboardComponent,
			),
	},
	{
		path: "user/:userId",
		loadComponent: () =>
			import("./pages/user/user.component").then((m) => m.UserComponent),
	},
	// Spread operator examples
	...adminRoutes,
	...(true ? devRoutes : []),
]
