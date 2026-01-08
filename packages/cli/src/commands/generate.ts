import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, join, relative, resolve } from "node:path"
import type { ApiIntegrationConfig, Screen } from "@screenbook/core"
import { define } from "gunshi"
import prompts from "prompts"
import { glob } from "tinyglobby"
import { parseAngularRouterConfig } from "../utils/angularRouterParser.js"
import { analyzeAngularComponent } from "../utils/angularTemplateAnalyzer.js"
import { analyzeApiImports } from "../utils/apiImportAnalyzer.js"
import { loadConfig } from "../utils/config.js"
import {
	DEFAULT_EXCLUDE_PATTERNS,
	matchesExcludePattern,
} from "../utils/constants.js"
import { ERRORS } from "../utils/errors.js"
import { logger, setVerbose } from "../utils/logger.js"
import {
	analyzeNavigation,
	detectNavigationFramework,
} from "../utils/navigationAnalyzer.js"
import {
	detectRouterType,
	parseReactRouterConfig,
} from "../utils/reactRouterParser.js"
import {
	type FlatRoute,
	flattenRoutes,
	type ParseResult,
} from "../utils/routeParserUtils.js"
import { parseSolidRouterConfig } from "../utils/solidRouterParser.js"
import { parseTanStackRouterConfig } from "../utils/tanstackRouterParser.js"
import { parseVueRouterConfig } from "../utils/vueRouterParser.js"
import { analyzeVueSFC } from "../utils/vueSFCTemplateAnalyzer.js"

/**
 * Common paths where Vue Router configuration files are typically located
 */
const VUE_ROUTER_CONFIG_PATHS = [
	"src/router/routes.ts",
	"src/router/index.ts",
	"src/router.ts",
	"src/routes.ts",
	"router/routes.ts",
	"router/index.ts",
]

/**
 * Detect Vue Router configuration file in the project
 */
function detectVueRouterConfigFile(cwd: string): string | null {
	for (const configPath of VUE_ROUTER_CONFIG_PATHS) {
		const absolutePath = join(cwd, configPath)
		if (existsSync(absolutePath)) {
			return absolutePath
		}
	}
	return null
}

/**
 * Build a map from component file paths to their route information.
 * Normalizes paths for reliable matching.
 */
function buildRouteComponentMap(
	flatRoutes: FlatRoute[],
	cwd: string,
): Map<string, FlatRoute> {
	const map = new Map<string, FlatRoute>()

	for (const route of flatRoutes) {
		if (route.componentPath) {
			// Normalize the component path relative to cwd
			const relativePath = relative(cwd, route.componentPath)
			// Use the directory containing the component as the key
			const componentDir = dirname(relativePath)
			// Also add a key for just the filename to handle different directory structures
			const componentName = basename(route.componentPath)
			const componentNameWithoutExt = componentName.replace(/\.[^.]+$/, "")

			map.set(componentDir, route)
			// Store by component directory name for matching with route file directories
			map.set(basename(componentDir), route)
			// Store by component filename without extension
			map.set(componentNameWithoutExt, route)
		}
	}

	return map
}

/**
 * Find matching route from the component map for a given route file
 */
function findMatchingRoute(
	routeFile: string,
	routeComponentMap: Map<string, FlatRoute>,
): FlatRoute | null {
	const routeDir = dirname(routeFile)
	const routeDirName = basename(routeDir)

	// Try exact directory match
	if (routeComponentMap.has(routeDir)) {
		return routeComponentMap.get(routeDir) ?? null
	}

	// Try directory name match
	if (routeComponentMap.has(routeDirName)) {
		return routeComponentMap.get(routeDirName) ?? null
	}

	// Try to find a component that shares the same directory name
	for (const [, route] of routeComponentMap) {
		if (route.componentPath) {
			const componentDir = dirname(route.componentPath)
			const componentDirName = basename(componentDir)
			if (componentDirName === routeDirName) {
				return route
			}
		}
	}

	return null
}

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
		detectApi: {
			type: "boolean",
			short: "a",
			description:
				"Detect API dependencies from imports (requires apiIntegration config)",
			default: false,
		},
		detectNavigation: {
			type: "boolean",
			short: "N",
			description:
				"Detect navigation targets from code (Link, router.push, navigate)",
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
		const dryRun = ctx.values.dryRun ?? false
		const force = ctx.values.force ?? false
		const interactive = ctx.values.interactive ?? false
		const detectApi = ctx.values.detectApi ?? false
		const detectNavigation = ctx.values.detectNavigation ?? false

		// Check for routes configuration
		if (!config.routesPattern && !config.routesFile) {
			logger.errorWithHelp(ERRORS.ROUTES_PATTERN_MISSING)
			process.exit(1)
		}

		// Validate --detect-api requires apiIntegration config
		if (detectApi && !config.apiIntegration) {
			logger.error(
				`${logger.bold("--detect-api")} requires ${logger.code("apiIntegration")} configuration`,
			)
			logger.blank()
			logger.log("Add to your screenbook.config.ts:")
			logger.blank()
			logger.log(
				logger.dim(`  export default defineConfig({
    apiIntegration: {
      clientPackages: ["@/api/generated"],
    },
  })`),
			)
			process.exit(1)
		}

		// Use routesFile mode (config-based routing)
		if (config.routesFile) {
			await generateFromRoutesFile(config.routesFile, cwd, {
				dryRun,
				force,
				interactive,
				detectApi,
				detectNavigation,
				apiIntegration: config.apiIntegration,
			})
			return
		}

		// Use routesPattern mode (file-based routing)
		await generateFromRoutesPattern(config.routesPattern as string, cwd, {
			dryRun,
			force,
			interactive,
			ignore: config.ignore,
			detectApi,
			detectNavigation,
			apiIntegration: config.apiIntegration,
		})
	},
})

interface GenerateFromRoutesFileOptions {
	readonly dryRun: boolean
	readonly force: boolean
	readonly interactive: boolean
	readonly detectApi: boolean
	readonly detectNavigation: boolean
	readonly apiIntegration?: ApiIntegrationConfig
}

/**
 * Generate screen.meta.ts files from a router config file (Vue Router or React Router)
 */
async function generateFromRoutesFile(
	routesFile: string,
	cwd: string,
	options: GenerateFromRoutesFileOptions,
): Promise<void> {
	const {
		dryRun,
		force,
		interactive,
		detectApi,
		detectNavigation,
		apiIntegration,
	} = options
	const absoluteRoutesFile = resolve(cwd, routesFile)

	// Check if routes file exists
	if (!existsSync(absoluteRoutesFile)) {
		logger.errorWithHelp(ERRORS.ROUTES_FILE_NOT_FOUND(routesFile))
		process.exit(1)
	}

	// Detect router type
	const content = readFileSync(absoluteRoutesFile, "utf-8")
	const routerType = detectRouterType(content)

	const routerTypeDisplay =
		routerType === "tanstack-router"
			? "TanStack Router"
			: routerType === "solid-router"
				? "Solid Router"
				: routerType === "angular-router"
					? "Angular Router"
					: routerType === "react-router"
						? "React Router"
						: routerType === "vue-router"
							? "Vue Router"
							: "unknown"

	logger.info(
		`Parsing routes from ${logger.path(routesFile)} (${routerTypeDisplay})...`,
	)
	logger.blank()

	// Parse the routes file with the appropriate parser
	let parseResult: ParseResult
	try {
		if (routerType === "tanstack-router") {
			parseResult = parseTanStackRouterConfig(absoluteRoutesFile)
		} else if (routerType === "solid-router") {
			parseResult = parseSolidRouterConfig(absoluteRoutesFile)
		} else if (routerType === "angular-router") {
			parseResult = parseAngularRouterConfig(absoluteRoutesFile)
		} else if (routerType === "react-router") {
			parseResult = parseReactRouterConfig(absoluteRoutesFile)
		} else if (routerType === "vue-router") {
			parseResult = parseVueRouterConfig(absoluteRoutesFile)
		} else {
			// Unknown router type - warn user and attempt Vue Router parser as fallback
			logger.warn(
				`Could not auto-detect router type for ${logger.path(routesFile)}. Attempting to parse as Vue Router.`,
			)
			logger.log(
				`  ${logger.dim("If parsing fails, check that your router imports are explicit.")}`,
			)
			parseResult = parseVueRouterConfig(absoluteRoutesFile)
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		logger.errorWithHelp(ERRORS.ROUTES_FILE_PARSE_ERROR(routesFile, message))
		process.exit(1)
	}

	// Show warnings
	for (const warning of parseResult.warnings) {
		logger.warn(warning)
	}

	// Flatten routes
	const flatRoutes = flattenRoutes(parseResult.routes)

	if (flatRoutes.length === 0) {
		logger.warn("No routes found in the config file")
		return
	}

	logger.log(`Found ${flatRoutes.length} routes`)
	logger.blank()

	let created = 0
	let skipped = 0

	for (const route of flatRoutes) {
		// Determine where to place screen.meta.ts
		const metaPath = determineMetaPath(route, cwd)
		const absoluteMetaPath = resolve(cwd, metaPath)

		// Skip routes in component directories (issue #170)
		if (matchesExcludePattern(metaPath, DEFAULT_EXCLUDE_PATTERNS)) {
			skipped++
			continue
		}

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

		const screenMeta: InferredScreenMeta = {
			id: route.screenId,
			title: route.screenTitle,
			route: route.fullPath,
		}

		// Detect API dependencies if enabled
		let detectedApis: string[] = []
		if (detectApi && apiIntegration && route.componentPath) {
			const componentAbsPath = resolve(cwd, route.componentPath)
			if (existsSync(componentAbsPath)) {
				try {
					const componentContent = readFileSync(componentAbsPath, "utf-8")
					const result = analyzeApiImports(componentContent, apiIntegration)
					detectedApis = result.imports.map((i) => i.dependsOnName)
					for (const warning of result.warnings) {
						logger.warn(`${logger.path(route.componentPath)}: ${warning}`)
					}
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error)
					logger.warn(
						`${logger.path(route.componentPath)}: Could not analyze for API imports: ${message}`,
					)
				}
			}
		}

		// Detect navigation targets if enabled
		let detectedNext: string[] = []
		if (detectNavigation && route.componentPath) {
			const componentAbsPath = resolve(cwd, route.componentPath)
			if (existsSync(componentAbsPath)) {
				let componentContent: string
				try {
					componentContent = readFileSync(componentAbsPath, "utf-8")
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error)
					logger.warn(
						`${logger.path(route.componentPath)}: Could not read file for navigation analysis: ${message}`,
					)
					componentContent = ""
				}

				if (componentContent) {
					// Use Vue SFC analyzer for .vue files to detect RouterLink in templates
					if (route.componentPath.endsWith(".vue")) {
						const result = analyzeVueSFC(componentContent, route.componentPath)
						detectedNext = [
							...result.templateNavigations.map((n) => n.screenId),
							...result.scriptNavigations.map((n) => n.screenId),
						]
						for (const warning of result.warnings) {
							logger.warn(`${logger.path(route.componentPath)}: ${warning}`)
						}
					} else if (route.componentPath.endsWith(".component.ts")) {
						// Use Angular component analyzer for .component.ts files
						const result = analyzeAngularComponent(
							componentContent,
							route.componentPath,
							cwd,
						)
						detectedNext = [
							...result.templateNavigations.map((n) => n.screenId),
							...result.scriptNavigations.map((n) => n.screenId),
						]
						for (const warning of result.warnings) {
							logger.warn(`${logger.path(route.componentPath)}: ${warning}`)
						}
					} else {
						// Use standard analyzer for non-Vue files
						const { framework, detected } =
							detectNavigationFramework(componentContent)
						if (!detected) {
							logger.warn(
								`${logger.path(route.componentPath)}: Could not detect navigation framework, defaulting to Next.js patterns. Navigation detection may be incomplete.`,
							)
						}
						const result = analyzeNavigation(componentContent, framework)
						detectedNext = result.navigations.map((n) => n.screenId)
						for (const warning of result.warnings) {
							logger.warn(`${logger.path(route.componentPath)}: ${warning}`)
						}
					}
				}
			}
		}

		if (interactive) {
			const result = await promptForScreen(route.fullPath, screenMeta)

			if (result.skip) {
				logger.itemWarn(`Skipped: ${logger.path(metaPath)}`)
				skipped++
				continue
			}

			const content = generateScreenMetaContent(result.meta, {
				owner: result.owner,
				tags: result.tags,
				dependsOn: detectedApis,
				next: detectedNext,
			})

			if (dryRun) {
				logDryRunOutput(
					metaPath,
					result.meta,
					result.owner,
					result.tags,
					detectedApis,
					detectedNext,
				)
				created++
			} else if (safeWriteFile(absoluteMetaPath, metaPath, content)) {
				created++
			}
		} else {
			const content = generateScreenMetaContent(screenMeta, {
				dependsOn: detectedApis,
				next: detectedNext,
			})

			if (dryRun) {
				logDryRunOutput(
					metaPath,
					screenMeta,
					undefined,
					undefined,
					detectedApis,
					detectedNext,
				)
				created++
			} else if (safeWriteFile(absoluteMetaPath, metaPath, content)) {
				created++
			}
		}
	}

	logSummary(created, skipped, dryRun)
}

export interface GenerateFromRoutesPatternOptions {
	readonly dryRun: boolean
	readonly force: boolean
	readonly interactive: boolean
	readonly ignore: readonly string[]
	readonly detectApi: boolean
	readonly detectNavigation: boolean
	readonly apiIntegration?: ApiIntegrationConfig
}

/**
 * Generate screen.meta.ts files from route files matching a glob pattern
 */
export async function generateFromRoutesPattern(
	routesPattern: string,
	cwd: string,
	options: GenerateFromRoutesPatternOptions,
): Promise<void> {
	const {
		dryRun,
		force,
		interactive,
		ignore,
		detectApi,
		detectNavigation,
		apiIntegration,
	} = options

	logger.info("Scanning for route files...")
	logger.blank()

	// Merge user ignore patterns with default exclude patterns for component directories
	const mergedIgnore = [...ignore, ...DEFAULT_EXCLUDE_PATTERNS]

	// Find all route files
	const routeFiles = await glob(routesPattern, {
		cwd,
		ignore: mergedIgnore,
	})

	if (routeFiles.length === 0) {
		logger.warn(`No route files found matching: ${routesPattern}`)
		return
	}

	logger.log(`Found ${routeFiles.length} route files`)

	// For Vue projects, try to detect and parse Vue Router configuration
	let routeComponentMap: Map<string, FlatRoute> | null = null
	const isVuePattern = routesPattern.includes(".vue")

	if (isVuePattern) {
		const vueRouterConfig = detectVueRouterConfigFile(cwd)
		if (vueRouterConfig) {
			try {
				const parseResult = parseVueRouterConfig(vueRouterConfig)
				const flatRoutes = flattenRoutes(parseResult.routes)
				if (flatRoutes.length > 0) {
					routeComponentMap = buildRouteComponentMap(flatRoutes, cwd)
					logger.log(
						`  ${logger.dim(`(using routes from ${relative(cwd, vueRouterConfig)})`)}`,
					)
				}
				for (const warning of parseResult.warnings) {
					logger.warn(warning)
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error)
				logger.warn(`Could not parse Vue Router config: ${message}`)
			}
		}
	}

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

		// Try to find matching route from Vue Router config first
		let screenMeta: InferredScreenMeta
		const matchedRoute = routeComponentMap
			? findMatchingRoute(routeFile, routeComponentMap)
			: null

		if (matchedRoute) {
			// Use route information from Vue Router config
			screenMeta = {
				id: matchedRoute.screenId,
				title: matchedRoute.screenTitle,
				route: matchedRoute.fullPath,
			}
		} else {
			// Fall back to path-based inference
			screenMeta = inferScreenMeta(routeDir, routesPattern)
		}

		// Detect API dependencies if enabled
		let detectedApis: string[] = []
		if (detectApi && apiIntegration) {
			const absoluteRouteFile = join(cwd, routeFile)
			if (existsSync(absoluteRouteFile)) {
				try {
					const routeContent = readFileSync(absoluteRouteFile, "utf-8")
					const result = analyzeApiImports(routeContent, apiIntegration)
					detectedApis = result.imports.map((i) => i.dependsOnName)
					for (const warning of result.warnings) {
						logger.warn(`${logger.path(routeFile)}: ${warning}`)
					}
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error)
					logger.warn(
						`${logger.path(routeFile)}: Could not analyze for API imports: ${message}`,
					)
				}
			}
		}

		// Detect navigation targets if enabled
		let detectedNext: string[] = []
		if (detectNavigation) {
			const absoluteRouteFile = join(cwd, routeFile)
			if (existsSync(absoluteRouteFile)) {
				let routeContent: string
				try {
					routeContent = readFileSync(absoluteRouteFile, "utf-8")
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error)
					logger.warn(
						`${logger.path(routeFile)}: Could not read file for navigation analysis: ${message}`,
					)
					routeContent = ""
				}

				if (routeContent) {
					const { framework, detected } =
						detectNavigationFramework(routeContent)
					if (!detected) {
						logger.warn(
							`${logger.path(routeFile)}: Could not detect navigation framework, defaulting to Next.js patterns. Navigation detection may be incomplete.`,
						)
					}
					const result = analyzeNavigation(routeContent, framework)
					detectedNext = result.navigations.map((n) => n.screenId)
					for (const warning of result.warnings) {
						logger.warn(`${logger.path(routeFile)}: ${warning}`)
					}
				}
			}
		}

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
				dependsOn: detectedApis,
				next: detectedNext,
			})

			if (dryRun) {
				logDryRunOutput(
					metaPath,
					result.meta,
					result.owner,
					result.tags,
					detectedApis,
					detectedNext,
				)
				created++
			} else if (safeWriteFile(absoluteMetaPath, metaPath, content)) {
				created++
			}
		} else {
			const content = generateScreenMetaContent(screenMeta, {
				dependsOn: detectedApis,
				next: detectedNext,
			})

			if (dryRun) {
				logDryRunOutput(
					metaPath,
					screenMeta,
					undefined,
					undefined,
					detectedApis,
					detectedNext,
				)
				created++
			} else if (safeWriteFile(absoluteMetaPath, metaPath, content)) {
				created++
			}
		}
	}

	logSummary(created, skipped, dryRun)
}

/**
 * Determine where to place screen.meta.ts for a route
 */
function determineMetaPath(route: FlatRoute, cwd: string): string {
	// If component path is available, place screen.meta.ts next to it
	if (route.componentPath) {
		const componentDir = dirname(route.componentPath)
		const relativePath = relative(cwd, componentDir)
		// Ensure path doesn't escape cwd
		if (!relativePath.startsWith("..")) {
			return join(relativePath, "screen.meta.ts")
		}
	}

	// Fall back to src/screens/{screenId}/screen.meta.ts
	const screenDir = route.screenId.replace(/\./g, "/")
	return join("src", "screens", screenDir, "screen.meta.ts")
}

/**
 * Ensure the directory for a file exists
 */
function ensureDirectoryExists(filePath: string): void {
	const dir = dirname(filePath)
	if (!existsSync(dir)) {
		try {
			mkdirSync(dir, { recursive: true })
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			throw new Error(`Failed to create directory "${dir}": ${message}`)
		}
	}
}

/**
 * Safely write a file with error handling
 * Returns true if successful, false if failed
 */
function safeWriteFile(
	absolutePath: string,
	relativePath: string,
	content: string,
): boolean {
	try {
		ensureDirectoryExists(absolutePath)
		writeFileSync(absolutePath, content)
		logger.itemSuccess(`Created: ${logger.path(relativePath)}`)
		return true
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		logger.itemError(
			`Failed to create ${logger.path(relativePath)}: ${message}`,
		)
		return false
	}
}

/**
 * Log dry run output for a screen
 */
function logDryRunOutput(
	metaPath: string,
	meta: InferredScreenMeta,
	owner?: string[],
	tags?: string[],
	dependsOn?: string[],
	next?: string[],
): void {
	logger.step(`Would create: ${logger.path(metaPath)}`)
	logger.log(`    ${logger.dim(`id: "${meta.id}"`)}`)
	logger.log(`    ${logger.dim(`title: "${meta.title}"`)}`)
	logger.log(`    ${logger.dim(`route: "${meta.route}"`)}`)
	if (owner && owner.length > 0) {
		logger.log(
			`    ${logger.dim(`owner: [${owner.map((o) => `"${o}"`).join(", ")}]`)}`,
		)
	}
	if (tags && tags.length > 0) {
		logger.log(
			`    ${logger.dim(`tags: [${tags.map((t) => `"${t}"`).join(", ")}]`)}`,
		)
	}
	if (dependsOn && dependsOn.length > 0) {
		logger.log(
			`    ${logger.dim(`dependsOn: [${dependsOn.map((d) => `"${d}"`).join(", ")}]`)}`,
		)
	}
	if (next && next.length > 0) {
		logger.log(
			`    ${logger.dim(`next: [${next.map((n) => `"${n}"`).join(", ")}]`)}`,
		)
	}
	logger.blank()
}

/**
 * Log summary after generation
 */
function logSummary(created: number, skipped: number, dryRun: boolean): void {
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
			logger.log("  1. Review and customize the generated screen.meta.ts files")
			logger.log(
				`  2. Run ${logger.code("screenbook dev")} to view your screen catalog`,
			)
		}
	}
}

/**
 * Subset of Screen containing only auto-inferred fields.
 * Uses Pick to ensure type alignment with the core Screen type.
 */
type InferredScreenMeta = Pick<Screen, "id" | "title" | "route">

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

type GenerateOptions = Partial<
	Pick<Screen, "owner" | "tags" | "dependsOn" | "next">
>

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
	const dependsOn = options?.dependsOn ?? []
	const next = options?.next ?? []

	const ownerStr =
		owner.length > 0 ? `[${owner.map((o) => `"${o}"`).join(", ")}]` : "[]"
	const tagsStr = `[${tags.map((t) => `"${t}"`).join(", ")}]`
	const dependsOnStr =
		dependsOn.length > 0
			? `[${dependsOn.map((d) => `"${d}"`).join(", ")}]`
			: "[]"
	const nextStr =
		next.length > 0 ? `[${next.map((n) => `"${n}"`).join(", ")}]` : "[]"

	// Generate dependsOn comment based on whether APIs were detected
	const dependsOnComment =
		dependsOn.length > 0
			? "// Auto-detected API dependencies (add more as needed)"
			: `// APIs/services this screen depends on (for impact analysis)
	// Example: ["UserAPI.getProfile", "PaymentService.checkout"]`

	// Generate next comment based on whether navigation was detected
	const nextComment =
		next.length > 0
			? "// Auto-detected navigation targets (add more as needed)"
			: "// Screen IDs this screen can navigate to"

	return `import { defineScreen } from "screenbook"

export const screen = defineScreen({
	id: "${meta.id}",
	title: "${meta.title}",
	route: "${meta.route}",

	// Team or individual responsible for this screen
	owner: ${ownerStr},

	// Tags for filtering in the catalog
	tags: ${tagsStr},

	${dependsOnComment}
	dependsOn: ${dependsOnStr},

	// Screen IDs that can navigate to this screen
	entryPoints: [],

	${nextComment}
	next: ${nextStr},
})
`
}
