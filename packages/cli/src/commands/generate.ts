import { existsSync, writeFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { define } from "gunshi"
import prompts from "prompts"
import { glob } from "tinyglobby"
import { loadConfig } from "../utils/config.js"
import { ERRORS } from "../utils/errors.js"
import { logger } from "../utils/logger.js"

export const generateCommand = define({
	name: "generate",
	description: "Auto-generate screen.meta.ts files from route files",
	args: {
		config: {
			type: "string",
			short: "c",
			description: "Path to config file",
		},
		dryRun: {
			type: "boolean",
			short: "n",
			description: "Show what would be generated without writing files",
			default: false,
		},
		force: {
			type: "boolean",
			short: "f",
			description: "Overwrite existing screen.meta.ts files",
			default: false,
		},
		interactive: {
			type: "boolean",
			short: "i",
			description: "Interactively confirm or modify each screen",
			default: false,
		},
	},
	run: async (ctx) => {
		const config = await loadConfig(ctx.values.config)
		const cwd = process.cwd()
		const dryRun = ctx.values.dryRun ?? false
		const force = ctx.values.force ?? false
		const interactive = ctx.values.interactive ?? false

		if (!config.routesPattern) {
			logger.errorWithHelp(ERRORS.ROUTES_PATTERN_MISSING)
			process.exit(1)
		}

		logger.info("Scanning for route files...")
		logger.blank()

		// Find all route files
		const routeFiles = await glob(config.routesPattern, {
			cwd,
			ignore: config.ignore,
		})

		if (routeFiles.length === 0) {
			logger.warn(`No route files found matching: ${config.routesPattern}`)
			return
		}

		logger.log(`Found ${routeFiles.length} route files`)
		logger.blank()

		let created = 0
		let skipped = 0

		for (const routeFile of routeFiles) {
			const routeDir = dirname(routeFile)
			const metaPath = join(routeDir, "screen.meta.ts")
			const absoluteMetaPath = join(cwd, metaPath)

			if (!force && existsSync(absoluteMetaPath)) {
				if (!interactive) {
					skipped++
					continue
				}
				logger.itemWarn(
					`Exists: ${logger.path(metaPath)} (use --force to overwrite)`,
				)
				skipped++
				continue
			}

			// Generate screen metadata from path
			const screenMeta = inferScreenMeta(routeDir, config.routesPattern)

			if (interactive) {
				const result = await promptForScreen(routeFile, screenMeta)

				if (result.skip) {
					logger.itemWarn(`Skipped: ${logger.path(metaPath)}`)
					skipped++
					continue
				}

				const content = generateScreenMetaContent(result.meta, {
					owner: result.owner,
					tags: result.tags,
				})

				if (dryRun) {
					logger.step(`Would create: ${logger.path(metaPath)}`)
					logger.log(`    ${logger.dim(`id: "${result.meta.id}"`)}`)
					logger.log(`    ${logger.dim(`title: "${result.meta.title}"`)}`)
					logger.log(`    ${logger.dim(`route: "${result.meta.route}"`)}`)
					if (result.owner.length > 0) {
						logger.log(
							`    ${logger.dim(`owner: [${result.owner.map((o) => `"${o}"`).join(", ")}]`)}`,
						)
					}
					if (result.tags.length > 0) {
						logger.log(
							`    ${logger.dim(`tags: [${result.tags.map((t) => `"${t}"`).join(", ")}]`)}`,
						)
					}
					logger.blank()
				} else {
					writeFileSync(absoluteMetaPath, content)
					logger.itemSuccess(`Created: ${logger.path(metaPath)}`)
				}
			} else {
				const content = generateScreenMetaContent(screenMeta)

				if (dryRun) {
					logger.step(`Would create: ${logger.path(metaPath)}`)
					logger.log(`    ${logger.dim(`id: "${screenMeta.id}"`)}`)
					logger.log(`    ${logger.dim(`title: "${screenMeta.title}"`)}`)
					logger.log(`    ${logger.dim(`route: "${screenMeta.route}"`)}`)
					logger.blank()
				} else {
					writeFileSync(absoluteMetaPath, content)
					logger.itemSuccess(`Created: ${logger.path(metaPath)}`)
				}
			}

			created++
		}

		logger.blank()
		if (dryRun) {
			logger.info(`Would create ${created} files (${skipped} already exist)`)
			logger.blank()
			logger.log(`Run without ${logger.code("--dry-run")} to create files`)
		} else {
			logger.done(`Created ${created} files (${skipped} skipped)`)
			if (created > 0) {
				logger.blank()
				logger.log(logger.bold("Next steps:"))
				logger.log(
					"  1. Review and customize the generated screen.meta.ts files",
				)
				logger.log(
					`  2. Run ${logger.code("screenbook dev")} to view your screen catalog`,
				)
			}
		}
	},
})

interface InferredScreenMeta {
	id: string
	title: string
	route: string
}

interface InteractiveResult {
	skip: boolean
	meta: InferredScreenMeta
	owner: string[]
	tags: string[]
}

/**
 * Parse comma-separated string into array
 */
export function parseCommaSeparated(input: string): string[] {
	if (!input.trim()) return []
	return input
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean)
}

/**
 * Prompt user for screen metadata in interactive mode
 */
async function promptForScreen(
	routeFile: string,
	inferred: InferredScreenMeta,
): Promise<InteractiveResult> {
	logger.blank()
	logger.info(`Found: ${logger.path(routeFile)}`)
	logger.blank()
	logger.log(
		`  ${logger.dim("ID:")} ${inferred.id} ${logger.dim("(inferred)")}`,
	)
	logger.log(
		`  ${logger.dim("Title:")} ${inferred.title} ${logger.dim("(inferred)")}`,
	)
	logger.log(
		`  ${logger.dim("Route:")} ${inferred.route} ${logger.dim("(inferred)")}`,
	)
	logger.blank()

	const response = await prompts([
		{
			type: "confirm",
			name: "proceed",
			message: "Generate this screen?",
			initial: true,
		},
		{
			type: (prev) => (prev ? "text" : null),
			name: "id",
			message: "ID",
			initial: inferred.id,
		},
		{
			type: (_prev, values) => (values.proceed ? "text" : null),
			name: "title",
			message: "Title",
			initial: inferred.title,
		},
		{
			type: (_prev, values) => (values.proceed ? "text" : null),
			name: "owner",
			message: "Owner (comma-separated)",
			initial: "",
		},
		{
			type: (_prev, values) => (values.proceed ? "text" : null),
			name: "tags",
			message: "Tags (comma-separated)",
			initial: inferred.id.split(".")[0] || "",
		},
	])

	if (!response.proceed) {
		return { skip: true, meta: inferred, owner: [], tags: [] }
	}

	return {
		skip: false,
		meta: {
			id: response.id || inferred.id,
			title: response.title || inferred.title,
			route: inferred.route,
		},
		owner: parseCommaSeparated(response.owner || ""),
		tags: parseCommaSeparated(response.tags || ""),
	}
}

/**
 * Infer screen metadata from the route file path
 */
function inferScreenMeta(
	routeDir: string,
	routesPattern: string,
): InferredScreenMeta {
	// Extract base directory from pattern (e.g., "src/pages" from "src/pages/**/page.tsx")
	const patternBase = routesPattern.split("*")[0]?.replace(/\/$/, "") ?? ""

	// Get relative path from pattern base
	const relativePath = relative(patternBase, routeDir)

	// Handle root route
	if (!relativePath || relativePath === ".") {
		return {
			id: "home",
			title: "Home",
			route: "/",
		}
	}

	// Clean up path segments (remove route groups like (marketing), handle dynamic segments)
	const segments = relativePath
		.split("/")
		.filter((s) => s && !s.startsWith("(") && !s.endsWith(")"))
		.map((s) =>
			s.replace(/^\[\.\.\..*\]$/, "catchall").replace(/^\[(.+)\]$/, "$1"),
		)

	// Generate ID from segments (e.g., "billing.invoice.detail")
	const id = segments.join(".")

	// Generate title from last segment (e.g., "Invoice Detail" from "invoice-detail")
	const lastSegment = segments[segments.length - 1] || "home"
	const title = lastSegment
		.split(/[-_]/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ")

	// Generate route from path (e.g., "/billing/invoice/:id")
	const routeSegments = relativePath
		.split("/")
		.filter((s) => s && !s.startsWith("(") && !s.endsWith(")"))
		.map((s) => {
			// Convert [id] to :id, [...slug] to *
			if (s.startsWith("[...") && s.endsWith("]")) {
				return "*"
			}
			if (s.startsWith("[") && s.endsWith("]")) {
				return `:${s.slice(1, -1)}`
			}
			return s
		})
	const route = `/${routeSegments.join("/")}`

	return { id, title, route }
}

interface GenerateOptions {
	owner?: string[]
	tags?: string[]
}

/**
 * Generate screen.meta.ts file content
 */
function generateScreenMetaContent(
	meta: InferredScreenMeta,
	options?: GenerateOptions,
): string {
	// Use provided values or infer defaults
	const owner = options?.owner ?? []
	const tags =
		options?.tags && options.tags.length > 0
			? options.tags
			: [meta.id.split(".")[0] || "general"]

	const ownerStr =
		owner.length > 0 ? `[${owner.map((o) => `"${o}"`).join(", ")}]` : "[]"
	const tagsStr = `[${tags.map((t) => `"${t}"`).join(", ")}]`

	return `import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "${meta.id}",
	title: "${meta.title}",
	route: "${meta.route}",

	// Team or individual responsible for this screen
	owner: ${ownerStr},

	// Tags for filtering in the catalog
	tags: ${tagsStr},

	// APIs/services this screen depends on (for impact analysis)
	// Example: ["UserAPI.getProfile", "PaymentService.checkout"]
	dependsOn: [],

	// Screen IDs that can navigate to this screen
	entryPoints: [],

	// Screen IDs this screen can navigate to
	next: [],
})
`
}
