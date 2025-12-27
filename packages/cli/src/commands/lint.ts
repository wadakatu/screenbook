import { dirname, join, relative } from "node:path"
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
		fix: {
			type: "boolean",
			description: "Show fix suggestions",
			default: false,
		},
	},
	run: async (ctx) => {
		const config = await loadConfig(ctx.values.config)
		const cwd = process.cwd()
		const showFix = ctx.values.fix ?? false

		if (!config.routesPattern) {
			console.log("No routesPattern configured in screenbook.config")
			console.log("")
			console.log("Add routesPattern to your config to enable linting:")
			console.log("")
			console.log("  // screenbook.config.ts")
			console.log("  export default defineConfig({")
			console.log('    routesPattern: "src/pages/**/*.vue",  // for Vue')
			console.log(
				'    // routesPattern: "app/**/page.tsx",  // for Next.js App Router',
			)
			console.log(
				'    // routesPattern: "src/routes/**/*.tsx",  // for React Router',
			)
			console.log("  })")
			console.log("")
			return
		}

		console.log("Linting screen metadata coverage...")
		console.log("")

		// Find all route files
		const routeFiles = await glob(config.routesPattern, {
			cwd,
			ignore: config.lintIgnore,
		})

		if (routeFiles.length === 0) {
			console.log(`No route files found matching: ${config.routesPattern}`)
			return
		}

		// Find all screen.meta.ts files
		const metaPattern = join(config.screensDir, config.metaPattern)
		const metaFiles = await glob(metaPattern, { cwd })

		// Build a map of directories that have screen.meta.ts
		const metaDirs = new Set<string>()
		for (const metaFile of metaFiles) {
			metaDirs.add(dirname(metaFile))
		}

		// Build a set of screen names (relative paths from screensDir)
		const screenNames = new Set<string>()
		for (const metaFile of metaFiles) {
			const metaDir = dirname(metaFile)
			const screenName = relative(config.screensDir, metaDir)
			screenNames.add(screenName)
		}

		// Extract the base directory from routesPattern for relative path calculation
		const routesPatternParts = config.routesPattern.split("*")[0]
		const routesBaseDir = routesPatternParts.endsWith("/")
			? routesPatternParts.slice(0, -1)
			: dirname(routesPatternParts)

		// Check each route file
		const missingMeta: string[] = []
		const covered: string[] = []

		for (const routeFile of routeFiles) {
			const routeDir = dirname(routeFile)

			// Check if there's a screen.meta.ts in the same directory
			const hasMetaInSameDir = metaDirs.has(routeDir)

			// Check by comparing relative paths (e.g., "home" matches "home")
			const routeRelative = relative(routesBaseDir, routeDir)
			const hasMatchingScreen = screenNames.has(routeRelative)

			if (hasMetaInSameDir || hasMatchingScreen) {
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
				console.log(`  ✗ ${file}`)

				if (showFix) {
					const suggestedMetaPath = join(dirname(file), "screen.meta.ts")
					console.log(`    → Create: ${suggestedMetaPath}`)
				}
			}

			console.log("")

			if (!showFix) {
				console.log("Run with --fix to see suggestions for each file")
				console.log("")
			}

			console.log("Lint failed: Some routes are missing screen.meta.ts")
			process.exit(1)
		} else {
			console.log("All routes have screen.meta.ts files")
		}
	},
})
