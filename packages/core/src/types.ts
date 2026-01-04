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

	/**
	 * Wireframe-level mock definition for UI documentation.
	 * When defined, navigation targets (navigateTo, itemNavigateTo, rowNavigateTo)
	 * are automatically extracted and merged into the `next` array.
	 */
	mock?: ScreenMock
}

// =============================================================================
// Mock Types - Wireframe-level UI mockups for screen flow documentation
// =============================================================================

/**
 * Layout direction for mock sections
 */
export type MockLayout = "vertical" | "horizontal"

/**
 * Available element types for mock wireframes
 */
export type MockElementType =
	| "button"
	| "input"
	| "link"
	| "text"
	| "image"
	| "list"
	| "table"

/**
 * Base interface for all mock elements
 */
interface MockElementBase {
	/** Element type identifier */
	type: MockElementType
	/** Display label for the element */
	label: string
}

/**
 * Button element with optional navigation and styling
 */
export interface MockButtonElement extends MockElementBase {
	type: "button"
	/** Screen ID to navigate to when clicked */
	navigateTo?: string
	/** Visual style variant */
	variant?: "primary" | "secondary" | "danger"
}

/**
 * Input field element
 */
export interface MockInputElement extends MockElementBase {
	type: "input"
	/** Placeholder text */
	placeholder?: string
	/** Input type for semantics */
	inputType?: "text" | "email" | "password" | "textarea" | "search"
}

/**
 * Link element with optional navigation
 */
export interface MockLinkElement extends MockElementBase {
	type: "link"
	/** Screen ID to navigate to when clicked */
	navigateTo?: string
}

/**
 * Text element for labels and headings
 */
export interface MockTextElement extends MockElementBase {
	type: "text"
	/** Text style variant */
	variant?: "heading" | "subheading" | "body" | "caption"
}

/**
 * Image placeholder element
 */
export interface MockImageElement extends MockElementBase {
	type: "image"
	/** Aspect ratio (e.g., "16:9", "1:1") */
	aspectRatio?: string
}

/**
 * List element for displaying multiple items
 */
export interface MockListElement extends MockElementBase {
	type: "list"
	/** Number of items to display (default: 3) */
	itemCount?: number
	/** Screen ID to navigate to when an item is clicked */
	itemNavigateTo?: string
}

/**
 * Table element for displaying tabular data
 */
export interface MockTableElement extends MockElementBase {
	type: "table"
	/** Column headers */
	columns?: string[]
	/** Number of rows to display (default: 3) */
	rowCount?: number
	/** Screen ID to navigate to when a row is clicked */
	rowNavigateTo?: string
}

/**
 * Union type of all mock element variants
 */
export type MockElement =
	| MockButtonElement
	| MockInputElement
	| MockLinkElement
	| MockTextElement
	| MockImageElement
	| MockListElement
	| MockTableElement

/**
 * Section containing grouped mock elements
 */
export interface MockSection {
	/** Optional section title */
	title?: string
	/** Layout direction (default: "vertical") */
	layout?: MockLayout
	/** Elements within this section */
	elements: MockElement[]
	/** Nested child sections */
	children?: MockSection[]
}

/**
 * Complete mock definition for a screen
 */
export interface ScreenMock {
	/** Sections containing UI elements */
	sections: MockSection[]
}

// =============================================================================
// Mock Zod Schemas
// =============================================================================

const mockLayoutSchema = z.enum(["vertical", "horizontal"])

const mockElementBaseSchema = z.object({
	type: z.enum(["button", "input", "link", "text", "image", "list", "table"]),
	label: z.string().min(1),
})

const mockButtonElementSchema = mockElementBaseSchema.extend({
	type: z.literal("button"),
	navigateTo: z.string().optional(),
	variant: z.enum(["primary", "secondary", "danger"]).optional(),
})

const mockInputElementSchema = mockElementBaseSchema.extend({
	type: z.literal("input"),
	placeholder: z.string().optional(),
	inputType: z
		.enum(["text", "email", "password", "textarea", "search"])
		.optional(),
})

const mockLinkElementSchema = mockElementBaseSchema.extend({
	type: z.literal("link"),
	navigateTo: z.string().optional(),
})

const mockTextElementSchema = mockElementBaseSchema.extend({
	type: z.literal("text"),
	variant: z.enum(["heading", "subheading", "body", "caption"]).optional(),
})

const mockImageElementSchema = mockElementBaseSchema.extend({
	type: z.literal("image"),
	aspectRatio: z.string().optional(),
})

const mockListElementSchema = mockElementBaseSchema.extend({
	type: z.literal("list"),
	itemCount: z.number().int().positive().optional(),
	itemNavigateTo: z.string().optional(),
})

const mockTableElementSchema = mockElementBaseSchema.extend({
	type: z.literal("table"),
	columns: z.array(z.string()).optional(),
	rowCount: z.number().int().positive().optional(),
	rowNavigateTo: z.string().optional(),
})

const mockElementSchema = z.discriminatedUnion("type", [
	mockButtonElementSchema,
	mockInputElementSchema,
	mockLinkElementSchema,
	mockTextElementSchema,
	mockImageElementSchema,
	mockListElementSchema,
	mockTableElementSchema,
])

const mockSectionSchema: z.ZodType<MockSection> = z.lazy(() =>
	z.object({
		title: z.string().optional(),
		layout: mockLayoutSchema.optional(),
		elements: z.array(mockElementSchema),
		children: z.array(mockSectionSchema).optional(),
	}),
)

/**
 * Schema for screen mock definition (runtime validation)
 * @internal
 */
export const screenMockSchema = z.object({
	sections: z.array(mockSectionSchema),
})

// =============================================================================

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
	mock: screenMockSchema.optional(),
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
 * API integration configuration for auto-detecting dependencies from
 * OpenAPI-generated clients (Orval, openapi-typescript, etc.).
 *
 * @example
 * ```ts
 * const apiIntegration: ApiIntegrationConfig = {
 *   clientPackages: ["@/api/generated", "@company/backend-client"],
 *   extractApiName: (name) => name.replace(/^use/, ""),
 * }
 * ```
 */
export interface ApiIntegrationConfig {
	/**
	 * Package names to scan for API client imports.
	 * These should match the import paths used in your code.
	 * @example ["@/api/generated"]
	 * @example ["@company/backend-client", "@company/auth-client"]
	 */
	clientPackages: string[]

	/**
	 * Optional transform function to convert import name to dependsOn format.
	 * If not provided, the import name is used as-is.
	 * @example (name) => name.replace(/^use/, "")
	 * @example (name) => `API.${name}`
	 */
	extractApiName?: (importName: string) => string
}

/**
 * Schema for API integration configuration (runtime validation)
 * @internal
 */
export const apiIntegrationSchema = z.object({
	clientPackages: z.array(z.string()).min(1),
	// Function validation is complex in Zod v4, so we use z.any() for the optional transform function
	extractApiName: z.any().optional(),
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
	 * Glob pattern for route files (for generate/lint commands).
	 * Use this for file-based routing frameworks (Next.js, Nuxt, Remix, etc.).
	 * Cannot be used together with routesFile.
	 * @example "src/pages/**\/page.tsx"
	 * @example "app/**\/page.tsx"
	 * @example "src/routes/**\/*.tsx"
	 */
	routesPattern?: string

	/**
	 * Path to a router configuration file (for config-based routing).
	 * Use this for frameworks like Vue Router, React Router, etc.
	 * Cannot be used together with routesPattern.
	 * @example "src/router/routes.ts"
	 * @example "src/router/index.ts"
	 */
	routesFile?: string

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

	/**
	 * API integration configuration for auto-detecting dependencies
	 * from OpenAPI-generated clients (Orval, openapi-typescript, etc.)
	 * @example { clientPackages: ["@/api/generated"] }
	 */
	apiIntegration?: ApiIntegrationConfig
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
	 * Glob pattern for route files (for generate/lint commands).
	 * Use this for file-based routing frameworks.
	 * Cannot be used together with routesFile.
	 * @example "src/pages/**\/page.tsx"
	 */
	routesPattern?: string

	/**
	 * Path to a router configuration file (for config-based routing).
	 * Use this for frameworks like Vue Router, React Router, etc.
	 * Cannot be used together with routesPattern.
	 * @example "src/router/routes.ts"
	 */
	routesFile?: string

	/**
	 * Patterns to ignore when scanning.
	 * Defaults to node_modules and .git directories.
	 */
	ignore?: string[]

	/**
	 * Progressive adoption configuration
	 */
	adoption?: AdoptionConfig

	/**
	 * API integration configuration for auto-detecting dependencies
	 * from OpenAPI-generated clients
	 */
	apiIntegration?: ApiIntegrationConfig
}

/**
 * Schema for Screenbook configuration (runtime validation)
 * @internal
 */
export const configSchema = z
	.object({
		outDir: z.string().default(".screenbook"),
		metaPattern: z.string().default("src/**/screen.meta.ts"),
		routesPattern: z.string().optional(),
		routesFile: z.string().optional(),
		ignore: z.array(z.string()).default(["**/node_modules/**", "**/.git/**"]),
		adoption: adoptionSchema.optional(),
		apiIntegration: apiIntegrationSchema.optional(),
	})
	.refine((data) => !(data.routesPattern && data.routesFile), {
		message:
			"Cannot specify both 'routesPattern' and 'routesFile'. Use one or the other.",
		path: ["routesFile"],
	})
