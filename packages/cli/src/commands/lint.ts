import { existsSync, readFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import type { AdoptionConfig, Config, Screen } from "@screenbook/core"
import { define } from "gunshi"
import { minimatch } from "minimatch"
import { glob } from "tinyglobby"
import { parseAngularRouterConfig } from "../utils/angularRouterParser.js"
import { loadConfig } from "../utils/config.js"
import {
	DEFAULT_EXCLUDE_PATTERNS,
	matchesExcludePattern,
} from "../utils/constants.js"
import {
	detectCycles,
	formatCycleWarnings,
	getCycleSummary,
} from "../utils/cycleDetection.js"
import { validateDependsOnReferences } from "../utils/dependsOnValidation.js"
import { ERRORS } from "../utils/errors.js"
import { logger, setVerbose } from "../utils/logger.js"
import { parseOpenApiSpecs } from "../utils/openApiParser.js"
import {
	detectRouterType,
	parseReactRouterConfig,
} from "../utils/reactRouterParser.js"
import type { FlatRoute, ParseResult } from "../utils/routeParserUtils.js"
import { flattenRoutes } from "../utils/routeParserUtils.js"
import { parseSolidRouterConfig } from "../utils/solidRouterParser.js"
import { parseTanStackRouterConfig } from "../utils/tanstackRouterParser.js"
import { parseVueRouterConfig } from "../utils/vueRouterParser.js"

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
		strict: {
			type: "boolean",
			short: "s",
			description: "Fail on disallowed cycles",
			default: false,
		},
		verbose: {
			type: "boolean",
			short: "v",
			description: "Show detailed output including stack traces",
			default: false,
		},
	},
	run: async (ctx) => {
		setVerbose(ctx.values.verbose)
		const config = await loadConfig(ctx.values.config)
		const cwd = process.cwd()
		const adoption = config.adoption ?? { mode: "full" }
		let hasWarnings = false
		let shouldFailLint = false

		// Check for routes configuration
		if (!config.routesPattern && !config.routesFile) {
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

		// Use routesFile mode (config-based routing)
		if (config.routesFile) {
			await lintRoutesFile(
				config.routesFile,
				cwd,
				config,
				adoption,
				ctx.values.allowCycles ?? false,
				ctx.values.strict ?? false,
			)
			return
		}

		// Use routesPattern mode (file-based routing)
		// Find all route files
		let routeFiles = await glob(config.routesPattern as string, {
			cwd,
			ignore: config.ignore,
		})

		// Apply exclude patterns (default or custom)
		// This filters out component directories like "components/", "hooks/", etc.
		const excludePatterns = config.excludePatterns ?? DEFAULT_EXCLUDE_PATTERNS
		routeFiles = routeFiles.filter(
			(file) => !matchesExcludePattern(file, excludePatterns),
		)

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

				// Validate that screens is actually an array
				if (!Array.isArray(screens)) {
					logger.blank()
					logger.error("screens.json does not contain a valid array of screens")
					logger.log(`  ${logger.dim("Run 'screenbook build' to regenerate.")}`)
					process.exit(1)
				}

				// Check for orphan screens
				const orphanSetting = config.lint?.orphans ?? "warn"
				const orphanResult = checkAndReportOrphanScreens(screens, orphanSetting)
				if (orphanResult.hasWarnings) {
					hasWarnings = true
				}
				if (orphanResult.shouldFail) {
					logger.blank()
					logger.error("Lint failed: Orphan screens detected in strict mode")
					shouldFailLint = true
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

							if (ctx.values.strict) {
								logger.blank()
								logger.errorWithHelp(
									ERRORS.CYCLES_DETECTED(cycleResult.disallowedCycles.length),
								)
								process.exit(1)
							}
						}
					}
				}

				// Check for invalid navigation references
				const invalidNavs = findInvalidNavigations(screens)
				if (invalidNavs.length > 0) {
					hasWarnings = true
					logger.blank()
					logger.warn(`Invalid navigation targets (${invalidNavs.length}):`)
					logger.blank()
					logger.log(
						"  These navigation references point to non-existent screens.",
					)
					logger.blank()
					for (const inv of invalidNavs) {
						logger.itemWarn(
							`${inv.screenId} → ${logger.dim(inv.field)}: "${inv.target}"`,
						)
					}
					logger.blank()
					logger.log(
						`  ${logger.dim("Check that these screen IDs exist in your codebase.")}`,
					)
				}

				// Check dependsOn references against OpenAPI specs (if configured)
				if (config.apiIntegration?.openapi?.sources?.length) {
					const openApiResult = await validateDependsOnAgainstOpenApi(
						screens,
						config.apiIntegration.openapi.sources,
						cwd,
						ctx.values.strict ?? false,
					)
					if (openApiResult.hasWarnings) {
						hasWarnings = true
					}
				}
			} catch (error) {
				// Parse errors are critical - we cannot safely continue validation
				if (error instanceof SyntaxError) {
					logger.blank()
					logger.error("Failed to parse screens.json")
					logger.log(
						`  ${logger.dim("The file contains invalid JSON syntax.")}`,
					)
					logger.log(
						`  ${logger.dim("Run 'screenbook build' to regenerate the file.")}`,
					)
					process.exit(1)
				}

				// File system errors should also fail the lint
				if (
					error instanceof Error &&
					(error.message.includes("EACCES") || error.message.includes("EPERM"))
				) {
					logger.blank()
					logger.error("Permission denied reading screens.json")
					logger.log(`  ${logger.dim(error.message)}`)
					logger.log(
						`  ${logger.dim("Check file permissions on the .screenbook directory.")}`,
					)
					process.exit(1)
				}

				// Any other error is unexpected and should be reported
				logger.blank()
				logger.error("Unexpected error reading screens.json")
				if (error instanceof Error) {
					logger.log(`  ${logger.dim(error.message)}`)
				} else {
					logger.log(`  ${logger.dim(String(error))}`)
				}
				process.exit(1)
			}
		}

		if (shouldFailLint) {
			process.exit(1)
		}

		if (hasWarnings) {
			logger.blank()
			logger.warn("Lint completed with warnings.")
		}
	},
})

/**
 * Lint screen.meta.ts coverage for routesFile mode (config-based routing)
 */
async function lintRoutesFile(
	routesFile: string,
	cwd: string,
	config: Pick<
		Config,
		"metaPattern" | "outDir" | "ignore" | "apiIntegration" | "lint"
	>,
	adoption: AdoptionConfig,
	allowCycles: boolean,
	strict: boolean,
): Promise<boolean> {
	let hasWarnings = false
	let shouldFailLint = false
	const absoluteRoutesFile = resolve(cwd, routesFile)

	// Check if routes file exists
	if (!existsSync(absoluteRoutesFile)) {
		logger.errorWithHelp(ERRORS.ROUTES_FILE_NOT_FOUND(routesFile))
		process.exit(1)
	}

	logger.log(`Parsing routes from ${logger.path(routesFile)}...`)
	logger.blank()

	// Parse the routes file with auto-detection
	let flatRoutes: FlatRoute[]
	try {
		const content = readFileSync(absoluteRoutesFile, "utf-8")
		const routerType = detectRouterType(content)

		let parseResult: ParseResult
		try {
			if (routerType === "tanstack-router") {
				parseResult = parseTanStackRouterConfig(absoluteRoutesFile, content)
			} else if (routerType === "solid-router") {
				parseResult = parseSolidRouterConfig(absoluteRoutesFile, content)
			} else if (routerType === "angular-router") {
				parseResult = parseAngularRouterConfig(absoluteRoutesFile, content)
			} else if (routerType === "react-router") {
				parseResult = parseReactRouterConfig(absoluteRoutesFile, content)
			} else if (routerType === "vue-router") {
				parseResult = parseVueRouterConfig(absoluteRoutesFile, content)
			} else {
				// Unknown router type - warn user and attempt Vue Router parser as fallback
				logger.warn(
					`Could not auto-detect router type for ${logger.path(routesFile)}. Attempting to parse as Vue Router.`,
				)
				logger.log(
					`  ${logger.dim("If parsing fails, check that your router imports are explicit.")}`,
				)
				hasWarnings = true
				parseResult = parseVueRouterConfig(absoluteRoutesFile, content)
			}
		} catch (parseError) {
			// Parse errors get specific error message
			const message =
				parseError instanceof Error ? parseError.message : String(parseError)
			logger.errorWithHelp(ERRORS.ROUTES_FILE_PARSE_ERROR(routesFile, message))
			process.exit(1)
		}

		// Show warnings
		for (const warning of parseResult.warnings) {
			logger.warn(warning)
			hasWarnings = true
		}

		flatRoutes = flattenRoutes(parseResult.routes)
	} catch (error) {
		// File system errors get different handling
		if (error instanceof Error) {
			if (error.message.includes("ENOENT")) {
				logger.errorWithHelp(ERRORS.ROUTES_FILE_NOT_FOUND(routesFile))
			} else if (
				error.message.includes("EACCES") ||
				error.message.includes("EPERM")
			) {
				logger.blank()
				logger.error(`Permission denied reading ${routesFile}`)
				logger.log(`  ${logger.dim(error.message)}`)
				logger.log(`  ${logger.dim("Check file permissions.")}`)
			} else {
				logger.blank()
				logger.error(`Failed to read ${routesFile}`)
				logger.log(`  ${logger.dim(error.message)}`)
			}
		} else {
			logger.blank()
			logger.error(`Unexpected error: ${String(error)}`)
		}
		process.exit(1)
	}

	if (flatRoutes.length === 0) {
		logger.warn("No routes found in the config file")
		return hasWarnings
	}

	// Find all screen.meta.ts files
	const metaFiles = await glob(config.metaPattern, {
		cwd,
		ignore: config.ignore,
	})

	// Build a set of directories that have screen.meta.ts
	const metaDirs = new Set<string>()
	// Also build a map from directory basename to full path for component name matching
	const metaDirsByName = new Map<string, string>()
	for (const metaFile of metaFiles) {
		const dir = dirname(metaFile)
		metaDirs.add(dir)
		// Store lowercase basename for case-insensitive matching
		const baseName = dir.split("/").pop()?.toLowerCase() || ""
		if (baseName) {
			metaDirsByName.set(baseName, dir)
		}
	}

	// Check each route for screen.meta.ts coverage
	const missingMeta: FlatRoute[] = []
	const covered: FlatRoute[] = []

	for (const route of flatRoutes) {
		// Skip layout routes (components ending with "Layout" that typically don't need screen.meta)
		if (route.componentPath?.endsWith("Layout")) {
			continue
		}

		// Try multiple matching strategies
		let matched = false

		// Strategy 1: Check by determineMetaDir (path-based matching)
		const metaPath = determineMetaDir(route, cwd)
		if (metaDirs.has(metaPath)) {
			matched = true
		}

		// Strategy 2: Match by component name (for React Router)
		if (!matched && route.componentPath) {
			const componentName = route.componentPath.toLowerCase()
			if (metaDirsByName.has(componentName)) {
				matched = true
			}

			// Also try matching the last word of component name
			// e.g., "UserProfile" -> check for "profile" directory
			if (!matched) {
				// Split by uppercase letters to get parts
				const parts = route.componentPath.split(/(?=[A-Z])/)
				const lastPart = parts[parts.length - 1]
				if (parts.length > 1 && lastPart) {
					if (metaDirsByName.has(lastPart.toLowerCase())) {
						matched = true
					}
				}
			}
		}

		// Strategy 3: Match by screenId path pattern
		if (!matched) {
			const screenPath = route.screenId.replace(/\./g, "/")
			for (const dir of metaDirs) {
				if (dir.endsWith(screenPath)) {
					matched = true
					break
				}
			}
		}

		if (matched) {
			covered.push(route)
		} else {
			missingMeta.push(route)
		}
	}

	// Report results
	const total = covered.length + missingMeta.length
	const coveredCount = covered.length
	const missingCount = missingMeta.length
	const coveragePercent = Math.round((coveredCount / total) * 100)

	logger.log(`Found ${total} routes`)
	logger.log(`Coverage: ${coveredCount}/${total} (${coveragePercent}%)`)
	logger.blank()

	// Determine if lint should fail
	const minimumCoverage = adoption.minimumCoverage ?? 100
	const passedCoverage = coveragePercent >= minimumCoverage

	if (missingCount > 0) {
		logger.log(`Missing screen.meta.ts (${missingCount} routes):`)
		logger.blank()

		for (const route of missingMeta) {
			const suggestedMetaPath = determineSuggestedMetaPath(route, cwd)
			logger.itemError(
				`${route.fullPath}  ${logger.dim(`(${route.screenId})`)}`,
			)
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

	// Check for orphan screens and cycles using screens.json
	const screensPath = join(cwd, config.outDir, "screens.json")
	if (existsSync(screensPath)) {
		try {
			const content = readFileSync(screensPath, "utf-8")
			const screens = JSON.parse(content) as Screen[]

			// Validate that screens is actually an array
			if (!Array.isArray(screens)) {
				logger.blank()
				logger.error("screens.json does not contain a valid array of screens")
				logger.log(`  ${logger.dim("Run 'screenbook build' to regenerate.")}`)
				process.exit(1)
			}

			// Check for orphan screens
			const orphanSetting = config.lint?.orphans ?? "warn"
			const orphanResult = checkAndReportOrphanScreens(screens, orphanSetting)
			if (orphanResult.hasWarnings) {
				hasWarnings = true
			}
			if (orphanResult.shouldFail) {
				logger.blank()
				logger.error("Lint failed: Orphan screens detected in strict mode")
				shouldFailLint = true
			}

			// Check for circular navigation
			if (!allowCycles) {
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

						if (strict) {
							logger.blank()
							logger.errorWithHelp(
								ERRORS.CYCLES_DETECTED(cycleResult.disallowedCycles.length),
							)
							process.exit(1)
						}
					}
				}
			}

			// Check for invalid navigation references
			const invalidNavs = findInvalidNavigations(screens)
			if (invalidNavs.length > 0) {
				hasWarnings = true
				logger.blank()
				logger.warn(`Invalid navigation targets (${invalidNavs.length}):`)
				logger.blank()
				logger.log(
					"  These navigation references point to non-existent screens.",
				)
				logger.blank()
				for (const inv of invalidNavs) {
					logger.itemWarn(
						`${inv.screenId} → ${logger.dim(inv.field)}: "${inv.target}"`,
					)
				}
				logger.blank()
				logger.log(
					`  ${logger.dim("Check that these screen IDs exist in your codebase.")}`,
				)
			}

			// Check dependsOn references against OpenAPI specs (if configured)
			if (config.apiIntegration?.openapi?.sources?.length) {
				const openApiResult = await validateDependsOnAgainstOpenApi(
					screens,
					config.apiIntegration.openapi.sources,
					cwd,
					strict,
				)
				if (openApiResult.hasWarnings) {
					hasWarnings = true
				}
			}
		} catch (error) {
			// Parse errors are critical - we cannot safely continue validation
			if (error instanceof SyntaxError) {
				logger.blank()
				logger.error("Failed to parse screens.json")
				logger.log(`  ${logger.dim("The file contains invalid JSON syntax.")}`)
				logger.log(
					`  ${logger.dim("Run 'screenbook build' to regenerate the file.")}`,
				)
				process.exit(1)
			}

			// File system errors should also fail the lint
			if (
				error instanceof Error &&
				(error.message.includes("EACCES") || error.message.includes("EPERM"))
			) {
				logger.blank()
				logger.error("Permission denied reading screens.json")
				logger.log(`  ${logger.dim(error.message)}`)
				logger.log(
					`  ${logger.dim("Check file permissions on the .screenbook directory.")}`,
				)
				process.exit(1)
			}

			// Any other error is unexpected and should be reported
			logger.blank()
			logger.error("Unexpected error reading screens.json")
			if (error instanceof Error) {
				logger.log(`  ${logger.dim(error.message)}`)
			} else {
				logger.log(`  ${logger.dim(String(error))}`)
			}
			process.exit(1)
		}
	}

	if (shouldFailLint) {
		process.exit(1)
	}

	if (hasWarnings) {
		logger.blank()
		logger.warn("Lint completed with warnings.")
	}

	return hasWarnings
}

/**
 * Determine the directory where screen.meta.ts should be for a route
 */
function determineMetaDir(route: FlatRoute, cwd: string): string {
	// If component path is available, check relative to component directory
	if (route.componentPath) {
		const componentDir = dirname(route.componentPath)
		const relativePath = relative(cwd, componentDir)
		// Ensure path doesn't escape cwd
		if (!relativePath.startsWith("..")) {
			return relativePath
		}
	}

	// Fall back to src/screens/{screenId} convention
	const screenDir = route.screenId.replace(/\./g, "/")
	return join("src", "screens", screenDir)
}

/**
 * Determine the suggested screen.meta.ts path for a route
 */
function determineSuggestedMetaPath(route: FlatRoute, cwd: string): string {
	const metaDir = determineMetaDir(route, cwd)
	return join(metaDir, "screen.meta.ts")
}

interface InvalidNavigation {
	screenId: string
	field: string
	target: string
}

/**
 * Find navigation references that point to non-existent screens.
 * Checks `next`, `entryPoints` arrays and mock navigation targets.
 */
function findInvalidNavigations(screens: Screen[]): InvalidNavigation[] {
	const screenIds = new Set(screens.map((s) => s.id))
	const invalid: InvalidNavigation[] = []

	for (const screen of screens) {
		// Check next array
		if (screen.next) {
			for (const target of screen.next) {
				if (!screenIds.has(target)) {
					invalid.push({ screenId: screen.id, field: "next", target })
				}
			}
		}

		// Check entryPoints array
		if (screen.entryPoints) {
			for (const target of screen.entryPoints) {
				if (!screenIds.has(target)) {
					invalid.push({ screenId: screen.id, field: "entryPoints", target })
				}
			}
		}
	}

	return invalid
}

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

interface OrphanCheckResult {
	hasWarnings: boolean
	shouldFail: boolean
}

/**
 * Check for orphan screens and report based on configuration.
 * When all screens are orphans (common after initial generation),
 * show a tip instead of warnings to avoid confusing new users.
 */
function checkAndReportOrphanScreens(
	screens: Screen[],
	orphanSetting: "warn" | "off" | "error",
): OrphanCheckResult {
	if (orphanSetting === "off") {
		return { hasWarnings: false, shouldFail: false }
	}

	const orphans = findOrphanScreens(screens)

	if (orphans.length === 0) {
		return { hasWarnings: false, shouldFail: false }
	}

	// Check if ALL screens are orphans (common after initial generation)
	const allScreensAreOrphans = orphans.length === screens.length

	if (allScreensAreOrphans) {
		// Show friendly tip instead of warnings for new users
		logger.blank()
		logger.info("Tip: All screens are currently disconnected.")
		logger.blank()
		logger.log("  This is normal after initial setup. To connect screens:")
		logger.log("  1. Add 'entryPoints' to define how users reach each screen")
		logger.log("  2. Add 'next' to define navigation targets from each screen")
		logger.blank()

		// In error mode, even all-orphan state should fail
		if (orphanSetting === "error") {
			return { hasWarnings: true, shouldFail: true }
		}

		return { hasWarnings: false, shouldFail: false }
	}

	// Some screens are connected, some are orphans - show normal warnings
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

	if (orphanSetting === "error") {
		return { hasWarnings: true, shouldFail: true }
	}

	return { hasWarnings: true, shouldFail: false }
}

/**
 * Validate dependsOn references against OpenAPI specifications
 */
async function validateDependsOnAgainstOpenApi(
	screens: readonly Screen[],
	sources: readonly string[],
	cwd: string,
	strict: boolean,
): Promise<{ hasWarnings: boolean }> {
	let hasWarnings = false

	// Parse OpenAPI specs (errors are collected internally, not thrown)
	const parseResult = await parseOpenApiSpecs(sources, cwd)

	// Report parse errors as warnings
	for (const error of parseResult.errors) {
		hasWarnings = true
		logger.blank()
		logger.warn(`Failed to parse OpenAPI spec: ${error.source}`)
		logger.log(`  ${logger.dim(error.message)}`)
	}

	// Skip validation if no specs were parsed successfully
	if (parseResult.specs.length === 0) {
		return { hasWarnings }
	}

	// Validate dependsOn references
	const validationResult = validateDependsOnReferences(
		screens,
		parseResult.specs,
	)

	if (validationResult.errors.length > 0) {
		hasWarnings = true
		logger.blank()
		logger.warn(`Invalid API dependencies (${validationResult.errors.length}):`)
		logger.blank()
		logger.log(
			"  These dependsOn references don't match any OpenAPI operation.",
		)
		logger.blank()

		for (const error of validationResult.errors) {
			logger.itemWarn(`${error.screenId}: "${error.invalidApi}"`)
			if (error.suggestion) {
				logger.log(`    ${logger.dim(`Did you mean "${error.suggestion}"?`)}`)
			}
		}

		// Fail in strict mode
		if (strict) {
			logger.blank()
			logger.errorWithHelp(
				ERRORS.INVALID_API_DEPENDENCIES(validationResult.errors.length),
			)
			process.exit(1)
		}
	}

	return { hasWarnings }
}
