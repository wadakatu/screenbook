import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import type { Screen } from "@screenbook/core"
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
		let hasWarnings = false

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

		// Check for orphan screens (unreachable screens)
		const screensPath = join(cwd, config.outDir, "screens.json")
		if (existsSync(screensPath)) {
			try {
				const content = readFileSync(screensPath, "utf-8")
				const screens = JSON.parse(content) as Screen[]
				const orphans = findOrphanScreens(screens)

				if (orphans.length > 0) {
					hasWarnings = true
					console.log("")
					console.log(`⚠ Orphan screens detected (${orphans.length}):`)
					console.log("")
					console.log("  These screens have no entryPoints and are not")
					console.log("  referenced in any other screen's 'next' array.")
					console.log("")
					for (const orphan of orphans) {
						console.log(`  ⚠ ${orphan.id}  ${orphan.route}`)
					}
					console.log("")
					console.log("  Consider adding entryPoints or removing these screens.")
				}
			} catch {
				// Ignore errors reading screens.json
			}
		}

		if (hasWarnings) {
			console.log("")
			console.log("Lint completed with warnings.")
		}
	},
})

/**
 * Find screens that are unreachable (orphans).
 * A screen is an orphan if:
 * - It has no entryPoints defined
 * - AND it's not referenced in any other screen's `next` array
 */
function findOrphanScreens(screens: Screen[]): Screen[] {
	// Build a set of all screen IDs that are referenced in `next` arrays
	const referencedIds = new Set<string>()
	for (const screen of screens) {
		if (screen.next) {
			for (const nextId of screen.next) {
				referencedIds.add(nextId)
			}
		}
	}

	// Find orphan screens
	const orphans: Screen[] = []
	for (const screen of screens) {
		const hasEntryPoints = screen.entryPoints && screen.entryPoints.length > 0
		const isReferenced = referencedIds.has(screen.id)

		// A screen is an orphan if it has no entry points AND is not referenced
		if (!hasEntryPoints && !isReferenced) {
			orphans.push(screen)
		}
	}

	return orphans
}
