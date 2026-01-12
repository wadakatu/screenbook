import { Admin } from "../pages/Admin"
import { AdminSettings } from "../pages/Admin/Settings"

/**
 * Admin routes exported as an array for spread operator usage.
 * This demonstrates how screenbook can resolve spread operators
 * in TanStack Router's addChildren.
 */
export const adminRoutes = [
	{ path: "/admin", component: Admin },
	{ path: "/admin/settings", component: AdminSettings },
]
