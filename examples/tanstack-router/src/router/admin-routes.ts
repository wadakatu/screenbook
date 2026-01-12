/**
 * Admin routes exported as an array for spread operator usage.
 * This demonstrates how screenbook can resolve spread operators
 * in TanStack Router's addChildren.
 *
 * Note: These are plain route objects for screenbook's static analysis.
 * The actual TanStack Router routes are defined in routes.tsx using createRoute().
 */
export const adminRoutes = [
	{ path: "/admin", component: "../pages/Admin" },
	{ path: "/admin/settings", component: "../pages/Admin/Settings" },
]
