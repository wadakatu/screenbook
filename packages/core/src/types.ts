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

// ============================================================================
// Mock Types - Wireframe definition for screen visualization
// ============================================================================

/**
 * Layout direction for mock sections
 */
export type MockLayout = "vertical" | "horizontal"

/**
 * Element types supported in mock definitions
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
	/**
	 * Element type identifier
	 */
	type: MockElementType
	/**
	 * Display label or content for the element
	 * @example "Submit"
	 * @example "Search..."
	 */
	label: string
}

/**
 * Button element - can trigger navigation to another screen
 */
export interface MockButtonElement extends MockElementBase {
	type: "button"
	/**
	 * Screen ID to navigate to when clicked
	 * @example "billing.invoice.edit"
	 */
	navigateTo?: string
	/**
	 * Button variant for styling hints
	 * @default "secondary"
	 */
	variant?: "primary" | "secondary" | "danger"
}

/**
 * Input element - text field, textarea, etc.
 */
export interface MockInputElement extends MockElementBase {
	type: "input"
	/**
	 * Placeholder text shown when empty
	 */
	placeholder?: string
	/**
	 * Input subtype hint for rendering
	 * @default "text"
	 */
	inputType?: "text" | "email" | "password" | "textarea" | "search"
}

/**
 * Link element - can trigger navigation to another screen
 */
export interface MockLinkElement extends MockElementBase {
	type: "link"
	/**
	 * Screen ID to navigate to when clicked
	 * @example "settings.profile"
	 */
	navigateTo?: string
}

/**
 * Text element - static text display (headings, labels, body text)
 */
export interface MockTextElement extends MockElementBase {
	type: "text"
	/**
	 * Text variant for styling hints
	 * @default "body"
	 */
	variant?: "heading" | "subheading" | "body" | "caption"
}

/**
 * Image placeholder element
 */
export interface MockImageElement extends MockElementBase {
	type: "image"
	/**
	 * Aspect ratio hint for the placeholder
	 * @example "16:9"
	 * @example "1:1"
	 */
	aspectRatio?: string
}

/**
 * List element - for displaying repeated items
 */
export interface MockListElement extends MockElementBase {
	type: "list"
	/**
	 * Number of placeholder items to show
	 * @default 3
	 */
	itemCount?: number
	/**
	 * Screen ID to navigate to when an item is clicked
	 */
	itemNavigateTo?: string
}

/**
 * Table element - for tabular data display
 */
export interface MockTableElement extends MockElementBase {
	type: "table"
	/**
	 * Column headers
	 * @example ["Name", "Email", "Status"]
	 */
	columns?: string[]
	/**
	 * Number of placeholder rows to show
	 * @default 3
	 */
	rowCount?: number
	/**
	 * Screen ID to navigate to when a row is clicked
	 */
	rowNavigateTo?: string
}

/**
 * Union type for all mock elements
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
 * Section grouping elements with layout control
 */
export interface MockSection {
	/**
	 * Optional section title displayed as a header
	 * @example "Header"
	 * @example "Actions"
	 */
	title?: string
	/**
	 * Layout direction for elements in this section
	 * @default "vertical"
	 */
	layout?: MockLayout
	/**
	 * Elements within this section
	 */
	elements: MockElement[]
}

/**
 * Complete mock definition for a screen wireframe
 *
 * @example
 * ```ts
 * const mock: ScreenMock = {
 *   sections: [
 *     {
 *       title: "Header",
 *       layout: "horizontal",
 *       elements: [
 *         { type: "text", label: "Invoice #123", variant: "heading" },
 *         { type: "button", label: "Edit", navigateTo: "billing.invoice.edit" },
 *       ],
 *     },
 *   ],
 * }
 * ```
 */
export interface ScreenMock {
	/**
	 * Sections that compose the screen wireframe
	 */
	sections: MockSection[]
}

// ============================================================================
// Screen Types
// ============================================================================

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
	 * Mock wireframe definition for the screen.
	 * Used for visual representation in navigation graphs and screen detail pages.
	 * When defined, navigation targets (navigateTo) are automatically extracted to populate the `next` field.
	 *
	 * @example
	 * ```ts
	 * mock: {
	 *   sections: [
	 *     {
	 *       title: "Header",
	 *       layout: "horizontal",
	 *       elements: [
	 *         { type: "text", label: "Invoice #123", variant: "heading" },
	 *         { type: "button", label: "Edit", navigateTo: "billing.invoice.edit" },
	 *       ],
	 *     },
	 *   ],
	 * }
	 * ```
	 */
	mock?: ScreenMock
}

/**
 * Input type for defineScreen function.
 * Same as Screen but used for input validation.
 */
export type ScreenInput = Screen

// ============================================================================
// Mock Zod Schemas
// ============================================================================

/**
 * Schema for button element
 * @internal
 */
const mockButtonSchema = z.object({
	type: z.literal("button"),
	label: z.string().min(1),
	navigateTo: z.string().optional(),
	variant: z.enum(["primary", "secondary", "danger"]).optional(),
})

/**
 * Schema for input element
 * @internal
 */
const mockInputSchema = z.object({
	type: z.literal("input"),
	label: z.string().min(1),
	placeholder: z.string().optional(),
	inputType: z.enum(["text", "email", "password", "textarea", "search"]).optional(),
})

/**
 * Schema for link element
 * @internal
 */
const mockLinkSchema = z.object({
	type: z.literal("link"),
	label: z.string().min(1),
	navigateTo: z.string().optional(),
})

/**
 * Schema for text element
 * @internal
 */
const mockTextSchema = z.object({
	type: z.literal("text"),
	label: z.string().min(1),
	variant: z.enum(["heading", "subheading", "body", "caption"]).optional(),
})

/**
 * Schema for image element
 * @internal
 */
const mockImageSchema = z.object({
	type: z.literal("image"),
	label: z.string().min(1),
	aspectRatio: z.string().optional(),
})

/**
 * Schema for list element
 * @internal
 */
const mockListSchema = z.object({
	type: z.literal("list"),
	label: z.string().min(1),
	itemCount: z.number().int().positive().optional(),
	itemNavigateTo: z.string().optional(),
})

/**
 * Schema for table element
 * @internal
 */
const mockTableSchema = z.object({
	type: z.literal("table"),
	label: z.string().min(1),
	columns: z.array(z.string()).optional(),
	rowCount: z.number().int().positive().optional(),
	rowNavigateTo: z.string().optional(),
})

/**
 * Union schema for all mock elements
 * @internal
 */
const mockElementSchema = z.discriminatedUnion("type", [
	mockButtonSchema,
	mockInputSchema,
	mockLinkSchema,
	mockTextSchema,
	mockImageSchema,
	mockListSchema,
	mockTableSchema,
])

/**
 * Schema for mock section
 * @internal
 */
const mockSectionSchema = z.object({
	title: z.string().optional(),
	layout: z.enum(["vertical", "horizontal"]).optional(),
	elements: z.array(mockElementSchema).min(1),
})

/**
 * Schema for screen mock definition
 * @internal
 */
export const screenMockSchema = z.object({
	sections: z.array(mockSectionSchema).min(1),
})

// ============================================================================
// Screen Zod Schema
// ============================================================================

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
