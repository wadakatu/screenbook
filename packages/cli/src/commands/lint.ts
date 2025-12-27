import { dirname, join } from "node:path"
import { define } from "gunshi"
import { minimatch } from "minimatch"
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
		const adoption = config.adoption ?? { mode: "full" }

		if (!config.routesPattern) {
			console.log("Error: routesPattern not configured")
			console.log("")
			console.log("Add routesPattern to your screenbook.config.ts:")
			console.log("")
			console.log('  routesPattern: "src/pages/**/page.tsx",   // Vite/React')
			console.log(
				'  routesPattern: "app/**/page.tsx",         // Next.js App Router',
			)
			console.log('  routesPattern: "src/pages/**/*.vue",      // Vue/Nuxt')
			console.log("")
			process.exit(1)
		}

		console.log("Linting screen metadata coverage...")
		if (adoption.mode === "progressive") {
			console.log(`Mode: Progressive adoption`)
			if (adoption.includePatterns?.length) {
				console.log(`Checking: ${adoption.includePatterns.join(", ")}`)
			}
			if (adoption.minimumCoverage != null) {
				console.log(`Minimum coverage: ${adoption.minimumCoverage}%`)
			}
		}
		console.log("")

		// Find all route files
		let routeFiles = await glob(config.routesPattern, {
			cwd,
			ignore: config.ignore,
		})

		// In progressive mode, filter to only included patterns
		if (adoption.mode === "progressive" && adoption.includePatterns?.length) {
			routeFiles = routeFiles.filter((file) =>
				adoption.includePatterns!.some((pattern) => minimatch(file, pattern)),
			)
		}

		if (routeFiles.length === 0) {
			console.log(`No route files found matching: ${config.routesPattern}`)
			if (adoption.mode === "progressive" && adoption.includePatterns?.length) {
				console.log(
					`(filtered by includePatterns: ${adoption.includePatterns.join(", ")})`,
				)
			}
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

		// Determine if lint should fail
		const minimumCoverage = adoption.minimumCoverage ?? 100
		const passedCoverage = coveragePercent >= minimumCoverage

		if (missingCount > 0) {
			console.log(`Missing screen.meta.ts (${missingCount} files):`)
			console.log("")

			for (const file of missingMeta) {
				const suggestedMetaPath = join(dirname(file), "screen.meta.ts")
				console.log(`  ✗ ${file}`)
				console.log(`    → ${suggestedMetaPath}`)
			}

			console.log("")
		}

		if (!passedCoverage) {
			console.log(
				`Lint failed: Coverage ${coveragePercent}% is below minimum ${minimumCoverage}%`,
			)
			process.exit(1)
		} else if (missingCount > 0) {
			console.log(
				`✓ Coverage ${coveragePercent}% meets minimum ${minimumCoverage}%`,
			)
			if (adoption.mode === "progressive") {
				console.log(
					`  Tip: Increase minimumCoverage in config to gradually improve coverage`,
				)
			}
		} else {
			console.log("✓ All routes have screen.meta.ts files")
		}
	},
})
