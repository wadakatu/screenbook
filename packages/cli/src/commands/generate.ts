import { existsSync, writeFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { define } from "gunshi"
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
	},
	run: async (ctx) => {
		const config = await loadConfig(ctx.values.config)
		const cwd = process.cwd()
		const dryRun = ctx.values.dryRun ?? false
		const force = ctx.values.force ?? false

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
				skipped++
				continue
			}

			// Generate screen metadata from path
			const screenMeta = inferScreenMeta(routeDir, config.routesPattern)
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

/**
 * Generate screen.meta.ts file content
 */
function generateScreenMetaContent(meta: InferredScreenMeta): string {
	// Infer a tag from the first segment of the ID
	const inferredTag = meta.id.split(".")[0] || "general"

	return `import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "${meta.id}",
	title: "${meta.title}",
	route: "${meta.route}",

	// Team or individual responsible for this screen
	owner: [],

	// Tags for filtering in the catalog
	tags: ["${inferredTag}"],

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
