/**
 * Framework support data - single source of truth
 * Used by: docs, README generation script
 */

export type FrameworkStatus = "supported" | "planned"

export interface Framework {
	name: string
	status: FrameworkStatus
	autoGenerate: boolean
	routingType: "file-based" | "config-based"
	/** Example routesPattern for file-based routing */
	routesPattern?: string
}

export const frameworks: Framework[] = [
	// File-based routing - Supported
	{
		name: "Next.js (App Router)",
		status: "supported",
		autoGenerate: true,
		routingType: "file-based",
		routesPattern: "src/app/**/page.tsx",
	},
	{
		name: "Next.js (Pages Router)",
		status: "supported",
		autoGenerate: true,
		routingType: "file-based",
		routesPattern: "src/pages/**/*.tsx",
	},
	{
		name: "Nuxt",
		status: "supported",
		autoGenerate: true,
		routingType: "file-based",
		routesPattern: "pages/**/*.vue",
	},
	{
		name: "Remix",
		status: "supported",
		autoGenerate: true,
		routingType: "file-based",
		routesPattern: "app/routes/**/*.tsx",
	},
	{
		name: "Astro",
		status: "supported",
		autoGenerate: true,
		routingType: "file-based",
		routesPattern: "src/pages/**/*.astro",
	},
	{
		name: "SvelteKit",
		status: "supported",
		autoGenerate: true,
		routingType: "file-based",
		routesPattern: "src/routes/**/+page.svelte",
	},
	{
		name: "SolidStart",
		status: "supported",
		autoGenerate: true,
		routingType: "file-based",
		routesPattern: "src/routes/**/*.tsx",
	},
	{
		name: "QwikCity",
		status: "supported",
		autoGenerate: true,
		routingType: "file-based",
		routesPattern: "src/routes/**/index.tsx",
	},
	{
		name: "TanStack Start",
		status: "supported",
		autoGenerate: true,
		routingType: "file-based",
		routesPattern: "src/routes/**/*.tsx",
	},
	// Config-based routing - Supported
	{
		name: "React Router",
		status: "supported",
		autoGenerate: true,
		routingType: "config-based",
	},
	{
		name: "Vue Router",
		status: "supported",
		autoGenerate: true,
		routingType: "config-based",
	},
	{
		name: "TanStack Router",
		status: "supported",
		autoGenerate: true,
		routingType: "config-based",
	},
	{
		name: "Solid Router",
		status: "supported",
		autoGenerate: true,
		routingType: "config-based",
	},
	{
		name: "Angular Router",
		status: "supported",
		autoGenerate: true,
		routingType: "config-based",
	},
]

// Helper functions
export const fileBasedFrameworks = frameworks.filter(
	(f) => f.routingType === "file-based",
)
export const configBasedFrameworks = frameworks.filter(
	(f) => f.routingType === "config-based",
)
export const supportedFrameworks = frameworks.filter(
	(f) => f.status === "supported",
)
export const plannedFrameworks = frameworks.filter(
	(f) => f.status === "planned",
)
