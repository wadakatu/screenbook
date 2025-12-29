import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import type { Screen } from "@screenbook/core"
import { define } from "gunshi"
import { minimatch } from "minimatch"
import { glob } from "tinyglobby"
import { loadConfig } from "../utils/config.js"
import {
	detectCycles,
	formatCycleWarnings,
	getCycleSummary,
} from "../utils/cycleDetection.js"
import { ERRORS } from "../utils/errors.js"
import { logger } from "../utils/logger.js"

export const lintCommand = define({
	name: "lint",
	description: "Detect routes without screen.meta.ts files",
	args: {
		config: {
			type: "string",
			short: "c",
			description: "Path to config file",
		},
		allowCycles: {
			type: "boolean",
			description: "Suppress circular navigation warnings",
			default: false,
		},
	},
	run: async (ctx) => {
		const config = await loadConfig(ctx.values.config)
		const cwd = process.cwd()
		const adoption = config.adoption ?? { mode: "full" }
		let hasWarnings = false

		if (!config.routesPattern) {
			logger.errorWithHelp(ERRORS.ROUTES_PATTERN_MISSING)
			process.exit(1)
		}

		logger.info("Linting screen metadata coverage...")
		if (adoption.mode === "progressive") {
			logger.log(`Mode: Progressive adoption`)
			if (adoption.includePatterns?.length) {
				logger.log(`Checking: ${adoption.includePatterns.join(", ")}`)
			}
			if (adoption.minimumCoverage != null) {
				logger.log(`Minimum coverage: ${adoption.minimumCoverage}%`)
			}
		}
		logger.blank()

		// Find all route files
		let routeFiles = await glob(config.routesPattern, {
			cwd,
			ignore: config.ignore,
		})

		// In progressive mode, filter to only included patterns
		if (adoption.mode === "progressive" && adoption.includePatterns?.length) {
			routeFiles = routeFiles.filter((file) =>
				adoption.includePatterns?.some((pattern) => minimatch(file, pattern)),
			)
		}

		if (routeFiles.length === 0) {
			logger.warn(`No route files found matching: ${config.routesPattern}`)
			if (adoption.mode === "progressive" && adoption.includePatterns?.length) {
				logger.log(
					`  ${logger.dim(`(filtered by includePatterns: ${adoption.includePatterns.join(", ")})`)}`,
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

		logger.log(`Found ${total} route files`)
		logger.log(`Coverage: ${coveredCount}/${total} (${coveragePercent}%)`)
		logger.blank()

		// Determine if lint should fail
		const minimumCoverage = adoption.minimumCoverage ?? 100
		const passedCoverage = coveragePercent >= minimumCoverage

		if (missingCount > 0) {
			logger.log(`Missing screen.meta.ts (${missingCount} files):`)
			logger.blank()

			for (const file of missingMeta) {
				const suggestedMetaPath = join(dirname(file), "screen.meta.ts")
				logger.itemError(file)
				logger.log(`    ${logger.dim("→")} ${logger.path(suggestedMetaPath)}`)
			}

			logger.blank()
		}

		if (!passedCoverage) {
			logger.error(
				`Lint failed: Coverage ${coveragePercent}% is below minimum ${minimumCoverage}%`,
			)
			process.exit(1)
		} else if (missingCount > 0) {
			logger.success(
				`Coverage ${coveragePercent}% meets minimum ${minimumCoverage}%`,
			)
			if (adoption.mode === "progressive") {
				logger.log(
					`  ${logger.dim("Tip:")} Increase minimumCoverage in config to gradually improve coverage`,
				)
			}
		} else {
			logger.done("All routes have screen.meta.ts files")
		}

		// Check for orphan screens (unreachable screens) and cycles
		const screensPath = join(cwd, config.outDir, "screens.json")
		if (existsSync(screensPath)) {
			try {
				const content = readFileSync(screensPath, "utf-8")
				const screens = JSON.parse(content) as Screen[]

				// Check for orphan screens
				const orphans = findOrphanScreens(screens)

				if (orphans.length > 0) {
					hasWarnings = true
					logger.blank()
					logger.warn(`Orphan screens detected (${orphans.length}):`)
					logger.blank()
					logger.log("  These screens have no entryPoints and are not")
					logger.log("  referenced in any other screen's 'next' array.")
					logger.blank()
					for (const orphan of orphans) {
						logger.itemWarn(`${orphan.id}  ${logger.dim(orphan.route)}`)
					}
					logger.blank()
					logger.log(
						`  ${logger.dim("Consider adding entryPoints or removing these screens.")}`,
					)
				}

				// Check for circular navigation
				if (!ctx.values.allowCycles) {
					const cycleResult = detectCycles(screens)
					if (cycleResult.hasCycles) {
						hasWarnings = true
						logger.blank()
						logger.warn(getCycleSummary(cycleResult))
						logger.log(formatCycleWarnings(cycleResult.cycles))
						logger.blank()
						if (cycleResult.disallowedCycles.length > 0) {
							logger.log(
								`  ${logger.dim("Use 'allowCycles: true' in screen.meta.ts to allow intentional cycles.")}`,
							)
						}
					}
				}
			} catch {
				// Ignore errors reading screens.json
			}
		}

		if (hasWarnings) {
			logger.blank()
			logger.warn("Lint completed with warnings.")
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
