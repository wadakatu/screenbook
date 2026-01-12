import { DevDebug } from "../pages/Dev/Debug"

/**
 * Dev routes exported as an array for spread operator usage.
 * These routes are typically only included in development builds.
 */
export const devRoutes = [{ path: "/dev/debug", component: DevDebug }]
