/**
 * Dev routes exported as an array for spread operator usage.
 * These routes are typically only included in development builds.
 *
 * Note: These are plain route objects for screenbook's static analysis.
 * The actual TanStack Router routes are defined in routes.tsx using createRoute().
 */
export const devRoutes = [
	{ path: "/dev/debug", component: "../pages/Dev/Debug" },
]
