import { existsSync, writeFileSync } from "node:fs"
import { basename, dirname, join, relative } from "node:path"
import { define } from "gunshi"
import { glob } from "tinyglobby"
import { loadConfig } from "../utils/config.js"

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
			console.log("Error: routesPattern not configured")
			console.log("")
			console.log("Add routesPattern to your screenbook.config.ts:")
			console.log("")
			console.log('  routesPattern: "src/pages/**/page.tsx",   // Vite/React')
			console.log('  routesPattern: "app/**/page.tsx",         // Next.js App Router')
			console.log('  routesPattern: "src/pages/**/*.vue",      // Vue/Nuxt')
			console.log("")
			process.exit(1)
		}

		console.log("Scanning for route files...")
		console.log("")

		// Find all route files
		const routeFiles = await glob(config.routesPattern, {
			cwd,
			ignore: config.ignore,
		})

		if (routeFiles.length === 0) {
			console.log(`No route files found matching: ${config.routesPattern}`)
			return
		}

		console.log(`Found ${routeFiles.length} route files`)
		console.log("")

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
				console.log(`Would create: ${metaPath}`)
				console.log(`  id: "${screenMeta.id}"`)
				console.log(`  title: "${screenMeta.title}"`)
				console.log(`  route: "${screenMeta.route}"`)
				console.log("")
			} else {
				writeFileSync(absoluteMetaPath, content)
				console.log(`✓ Created: ${metaPath}`)
			}

			created++
		}

		console.log("")
		if (dryRun) {
			console.log(`Would create ${created} files (${skipped} already exist)`)
			console.log("")
			console.log("Run without --dry-run to create files")
		} else {
			console.log(`Created ${created} files (${skipped} skipped)`)
			if (created > 0) {
				console.log("")
				console.log("Next steps:")
				console.log("  1. Review and customize the generated screen.meta.ts files")
				console.log("  2. Run 'screenbook dev' to view your screen catalog")
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
function inferScreenMeta(routeDir: string, routesPattern: string): InferredScreenMeta {
	// Extract base directory from pattern (e.g., "src/pages" from "src/pages/**/page.tsx")
	const patternBase = routesPattern.split("*")[0].replace(/\/$/, "")

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
		.map((s) => s.replace(/^\[\.\.\..*\]$/, "catchall").replace(/^\[(.+)\]$/, "$1"))

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
	const route = "/" + routeSegments.join("/")

	return { id, title, route }
}

/**
 * Generate screen.meta.ts file content
 */
function generateScreenMetaContent(meta: InferredScreenMeta): string {
	return `import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "${meta.id}",
	title: "${meta.title}",
	route: "${meta.route}",
	// owner: [],
	// tags: [],
	// description: "",
	// entryPoints: [],
	// next: [],
})
`
}
