import { createBrowserRouter } from "react-router-dom"
import { RootLayout } from "../layouts/RootLayout"
import { Dashboard } from "../pages/Dashboard"
import { Home } from "../pages/Home"
import { Settings } from "../pages/Settings"
import { User } from "../pages/User"
import { UserProfile } from "../pages/User/Profile"
import { adminRoutes } from "./adminRoutes"

// Issue #209: Local route variable for spread operator resolution test
const devRoutes = [
	{
		path: "dev",
		element: <div>Dev Tools</div>,
	},
]

export const router = createBrowserRouter([
	{
		path: "/",
		element: <RootLayout />,
		children: [
			{
				index: true,
				element: <Home />,
			},
			{
				path: "dashboard",
				element: <Dashboard />,
			},
			{
				path: "settings",
				element: <Settings />,
			},
			{
				path: "users/:id",
				element: <User />,
				children: [
					{
						path: "profile",
						element: <UserProfile />,
					},
				],
			},
			// Issue #209: Spread operator - local variable resolution
			...devRoutes,
			// Issue #209: Spread operator - imported routes resolution
			...adminRoutes,
		],
	},
])
