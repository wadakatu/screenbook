import type { RouteObject } from "react-router-dom"

export const adminRoutes: RouteObject[] = [
	{
		path: "admin",
		children: [
			{
				path: "users",
				element: <div>Admin Users</div>,
			},
			{
				path: "settings",
				element: <div>Admin Settings</div>,
			},
		],
	},
]
