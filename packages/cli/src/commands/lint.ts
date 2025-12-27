import { dirname, join } from "node:path"
import { define } from "gunshi"
import { glob } from "tinyglobby"
import { loadConfig } from "../utils/config.js"

export const lintCommand = define({
	name: "lint",
	description: "Detect routes without screen.meta.ts files",
	args: {
		config: {
			type: "string",
			short: "c",
			description: "Path to config file",
		},
	},
	run: async (ctx) => {
		const config = await loadConfig(ctx.values.config)
		const cwd = process.cwd()

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

		console.log("Linting screen metadata coverage...")
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

		// Find all screen.meta.ts files
		const metaFiles = await glob(config.metaPattern, {
			cwd,
			ignore: config.ignore,
		})

		// Build a set of directories that have screen.meta.ts
		const metaDirs = new Set<string>()
		for (const metaFile of metaFiles) {
			metaDirs.add(dirname(metaFile))
		}

		// Check each route file - simple colocation check
		const missingMeta: string[] = []
		const covered: string[] = []

		for (const routeFile of routeFiles) {
			const routeDir = dirname(routeFile)

			// Check if there's a screen.meta.ts in the same directory
			if (metaDirs.has(routeDir)) {
				covered.push(routeFile)
			} else {
				missingMeta.push(routeFile)
			}
		}

		// Report results
		const total = routeFiles.length
		const coveredCount = covered.length
		const missingCount = missingMeta.length
		const coveragePercent = Math.round((coveredCount / total) * 100)

		console.log(`Found ${total} route files`)
		console.log(`Coverage: ${coveredCount}/${total} (${coveragePercent}%)`)
		console.log("")

		if (missingCount > 0) {
			console.log(`Missing screen.meta.ts (${missingCount} files):`)
			console.log("")

			for (const file of missingMeta) {
				const suggestedMetaPath = join(dirname(file), "screen.meta.ts")
				console.log(`  ✗ ${file}`)
				console.log(`    → ${suggestedMetaPath}`)
			}

			console.log("")
			console.log("Run 'screenbook generate' to auto-create missing files")
			console.log("")
			console.log("Lint failed: Some routes are missing screen.meta.ts")
			process.exit(1)
		} else {
			console.log("✓ All routes have screen.meta.ts files")
		}
	},
})
