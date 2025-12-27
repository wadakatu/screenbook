import { z } from "zod"

/**
 * Schema for screen metadata definition
 */
export const screenSchema = z.object({
	/** Unique identifier for the screen (e.g., "billing.invoice.detail") */
	id: z.string().min(1),

	/** Human-readable title of the screen */
	title: z.string().min(1),

	/** Route path pattern (e.g., "/billing/invoices/:id") */
	route: z.string().min(1),

	/** Team(s) or domain(s) that own this screen */
	owner: z.array(z.string()).optional(),

	/** Tags for categorization and filtering */
	tags: z.array(z.string()).optional(),

	/** APIs or services this screen depends on */
	dependsOn: z.array(z.string()).optional(),

	/** Screen IDs that can navigate to this screen */
	entryPoints: z.array(z.string()).optional(),

	/** Screen IDs this screen can navigate to */
	next: z.array(z.string()).optional(),

	/** Optional description of the screen */
	description: z.string().optional(),

	/** Links to external resources (Storybook, Figma, etc.) */
	links: z
		.array(
			z.object({
				label: z.string(),
				url: z.string().url(),
			}),
		)
		.optional(),
})

/**
 * Type for screen metadata definition
 */
export type Screen = z.infer<typeof screenSchema>

/**
 * Input type for defineScreen function (allows partial optional fields)
 */
export type ScreenInput = z.input<typeof screenSchema>

/**
 * Schema for Screenbook configuration
 */
export const configSchema = z.object({
	/** Output directory for generated files */
	outDir: z.string().default(".screenbook"),

	/**
	 * Glob pattern for screen metadata files
	 * Supports colocation: place screen.meta.ts alongside your route files
	 * @example "src/**\/screen.meta.ts" - scan entire src directory
	 * @example "app/**\/screen.meta.ts" - for Next.js App Router
	 */
	metaPattern: z.string().default("src/**/screen.meta.ts"),

	/**
	 * Glob pattern for route files (for generate/lint commands)
	 * @example "src/pages/**\/page.tsx" - Vite/React
	 * @example "app/**\/page.tsx" - Next.js App Router
	 * @example "src/routes/**\/*.tsx" - React Router
	 */
	routesPattern: z.string().optional(),

	/** Patterns to ignore when scanning (glob patterns) */
	ignore: z.array(z.string()).default(["**/node_modules/**", "**/.git/**"]),
})

/**
 * Type for Screenbook configuration
 */
export type Config = z.infer<typeof configSchema>

/**
 * Input type for defineConfig function
 */
export type ConfigInput = z.input<typeof configSchema>
