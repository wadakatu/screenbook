import { z } from "zod"

/**
 * External link to related resources
 */
export interface ScreenLink {
	/**
	 * Display label for the link
	 * @example "Figma Design"
	 * @example "Storybook"
	 */
	label: string
	/**
	 * URL to the external resource
	 * @example "https://figma.com/file/..."
	 * @example "https://storybook.example.com/?path=/story/billing-invoice"
	 */
	url: string
}

/**
 * Screen metadata definition for the screen catalog.
 *
 * @example
 * ```ts
 * const screen: Screen = {
 *   id: "billing.invoice.detail",
 *   title: "Invoice Detail",
 *   route: "/billing/invoices/:id",
 *   owner: ["billing-team"],
 *   tags: ["billing", "invoice"],
 *   dependsOn: ["InvoiceAPI.getDetail"],
 *   next: ["billing.invoice.edit"],
 * }
 * ```
 */
export interface Screen {
	/**
	 * Unique identifier for the screen using dot notation
	 * @example "billing.invoice.detail"
	 * @example "auth.login"
	 * @example "settings.profile"
	 */
	id: string

	/**
	 * Human-readable title displayed in the screen catalog
	 * @example "Invoice Detail"
	 * @example "Login"
	 * @example "User Profile Settings"
	 */
	title: string

	/**
	 * Route path pattern with optional dynamic segments
	 * @example "/billing/invoices/:id"
	 * @example "/auth/login"
	 * @example "/settings/profile"
	 */
	route: string

	/**
	 * Team(s) or domain(s) that own this screen
	 * @example ["billing-team"]
	 * @example ["platform", "billing"]
	 */
	owner?: string[]

	/**
	 * Tags for categorization and filtering in the catalog
	 * @example ["billing", "invoice"]
	 * @example ["auth", "security"]
	 */
	tags?: string[]

	/**
	 * APIs or services this screen depends on for impact analysis
	 * @example ["InvoiceAPI.getDetail", "PaymentAPI.getStatus"]
	 * @example ["UserAPI.getProfile"]
	 */
	dependsOn?: string[]

	/**
	 * Screen IDs that can navigate to this screen (incoming edges)
	 * @example ["billing.invoice.list"]
	 * @example ["dashboard.home", "nav.sidebar"]
	 */
	entryPoints?: string[]

	/**
	 * Screen IDs this screen can navigate to (outgoing edges)
	 * @example ["billing.invoice.edit", "billing.payment.start"]
	 * @example ["billing.invoice.list"]
	 */
	next?: string[]

	/**
	 * Allow circular navigation involving this screen.
	 * When true, cycles that include this screen will not trigger warnings.
	 * @default false
	 * @example true
	 */
	allowCycles?: boolean

	/**
	 * Optional description explaining the screen's purpose
	 * @example "Displays detailed invoice information including line items and payment status"
	 */
	description?: string

	/**
	 * Links to external resources like Storybook, Figma, or documentation
	 * @example [{ label: "Figma", url: "https://figma.com/file/..." }]
	 */
	links?: ScreenLink[]
}

/**
 * Input type for defineScreen function.
 * Same as Screen but used for input validation.
 */
export type ScreenInput = Screen

/**
 * Schema for screen metadata definition (runtime validation)
 * @internal
 */
export const screenSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
	route: z.string().min(1),
	owner: z.array(z.string()).optional(),
	tags: z.array(z.string()).optional(),
	dependsOn: z.array(z.string()).optional(),
	entryPoints: z.array(z.string()).optional(),
	next: z.array(z.string()).optional(),
	allowCycles: z.boolean().optional(),
	description: z.string().optional(),
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
 * Progressive adoption configuration for gradual rollout.
 *
 * @example
 * ```ts
 * const adoption: AdoptionConfig = {
 *   mode: "progressive",
 *   includePatterns: ["src/pages/billing/**"],
 *   minimumCoverage: 80,
 * }
 * ```
 */
export interface AdoptionConfig {
	/**
	 * Adoption mode for screen metadata coverage
	 * - `"full"`: All routes must have screen.meta.ts (default)
	 * - `"progressive"`: Only check coverage within includePatterns
	 * @default "full"
	 * @example "full"
	 * @example "progressive"
	 */
	mode?: "full" | "progressive"

	/**
	 * Glob patterns to include for coverage checking (progressive mode only)
	 * @example ["src/pages/billing/**"]
	 * @example ["src/pages/auth/**", "src/pages/settings/**"]
	 */
	includePatterns?: string[]

	/**
	 * Minimum coverage percentage required to pass lint (0-100)
	 * @example 80
	 * @example 100
	 */
	minimumCoverage?: number
}

/**
 * Schema for progressive adoption configuration (runtime validation)
 * @internal
 */
export const adoptionSchema = z.object({
	mode: z.enum(["full", "progressive"]).default("full"),
	includePatterns: z.array(z.string()).optional(),
	minimumCoverage: z.number().min(0).max(100).optional(),
})

/**
 * Screenbook configuration options.
 */
export interface Config {
	/**
	 * Output directory for generated files
	 * @default ".screenbook"
	 * @example ".screenbook"
	 * @example "dist/screenbook"
	 */
	outDir: string

	/**
	 * Glob pattern for screen metadata files.
	 * Supports colocation: place screen.meta.ts alongside your route files.
	 * @default "src/**\/screen.meta.ts"
	 * @example "src/**\/screen.meta.ts"
	 * @example "app/**\/screen.meta.ts"
	 */
	metaPattern: string

	/**
	 * Glob pattern for route files (for generate/lint commands)
	 * @example "src/pages/**\/page.tsx"
	 * @example "app/**\/page.tsx"
	 * @example "src/routes/**\/*.tsx"
	 */
	routesPattern?: string

	/**
	 * Patterns to ignore when scanning (glob patterns).
	 * Defaults to node_modules and .git directories.
	 */
	ignore: string[]

	/**
	 * Progressive adoption configuration for gradual rollout
	 * @example { mode: "progressive", includePatterns: ["src/pages/billing/**"], minimumCoverage: 80 }
	 */
	adoption?: AdoptionConfig
}

/**
 * Input type for defineConfig function.
 * All fields with defaults are optional in input.
 *
 * @example
 * ```ts
 * defineConfig({
 *   metaPattern: "app/**\/screen.meta.ts",
 *   routesPattern: "app/**\/page.tsx",
 * })
 * ```
 */
export interface ConfigInput {
	/**
	 * Output directory for generated files
	 * @default ".screenbook"
	 * @example ".screenbook"
	 */
	outDir?: string

	/**
	 * Glob pattern for screen metadata files
	 * @default "src/**\/screen.meta.ts"
	 * @example "app/**\/screen.meta.ts"
	 */
	metaPattern?: string

	/**
	 * Glob pattern for route files (for generate/lint commands)
	 * @example "src/pages/**\/page.tsx"
	 */
	routesPattern?: string

	/**
	 * Patterns to ignore when scanning.
	 * Defaults to node_modules and .git directories.
	 */
	ignore?: string[]

	/**
	 * Progressive adoption configuration
	 */
	adoption?: AdoptionConfig
}

/**
 * Schema for Screenbook configuration (runtime validation)
 * @internal
 */
export const configSchema = z.object({
	outDir: z.string().default(".screenbook"),
	metaPattern: z.string().default("src/**/screen.meta.ts"),
	routesPattern: z.string().optional(),
	ignore: z.array(z.string()).default(["**/node_modules/**", "**/.git/**"]),
	adoption: adoptionSchema.optional(),
})
