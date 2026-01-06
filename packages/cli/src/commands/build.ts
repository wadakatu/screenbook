import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import type { Screen } from "@screenbook/core"
import { define } from "gunshi"
import { createJiti } from "jiti"
import { glob } from "tinyglobby"
import { loadConfig } from "../utils/config.js"
import {
	detectCycles,
	formatCycleWarnings,
	getCycleSummary,
} from "../utils/cycleDetection.js"
import { ERRORS } from "../utils/errors.js"
import { logger, setVerbose } from "../utils/logger.js"
import {
	formatValidationErrors,
	validateScreenReferences,
} from "../utils/validation.js"

export interface CoverageData {
	total: number
	covered: number
	percentage: number
	missing: Array<{
		route: string
		suggestedPath: string
	}>
	byOwner: Record<string, { count: number; screens: string[] }>
	byTag: Record<string, number>
	timestamp: string
}

export const buildCommand = define({
	name: "build",
	description: "Build screen metadata JSON from screen.meta.ts files",
	args: {
		config: {
			type: "string",
			short: "c",
			description: "Path to config file",
		},
		outDir: {
			type: "string",
			short: "o",
			description: "Output directory",
		},
		strict: {
			type: "boolean",
			short: "s",
			description: "Fail on validation errors and disallowed cycles",
			default: false,
		},
		allowCycles: {
			type: "boolean",
			description: "Suppress all circular navigation warnings",
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
		const outDir = ctx.values.outDir ?? config.outDir
		const cwd = process.cwd()

		logger.info("Building screen metadata...")

		// Find all screen.meta.ts files
		const files = await glob(config.metaPattern, {
			cwd,
			ignore: config.ignore,
		})

		if (files.length === 0) {
			logger.warn(
				`No screen.meta.ts files found matching: ${config.metaPattern}`,
			)
			return
		}

		logger.info(`Found ${files.length} screen files`)

		// Create jiti instance for loading TypeScript files
		const jiti = createJiti(cwd)

		// Extended screen type with file path (for internal use)
		type ScreenWithFilePath = Screen & { filePath: string }

		// Load and collect screen metadata
		const screens: ScreenWithFilePath[] = []

		for (const file of files) {
			const absolutePath = resolve(cwd, file)

			try {
				const module = (await jiti.import(absolutePath)) as { screen?: Screen }
				if (module.screen) {
					screens.push({ ...module.screen, filePath: absolutePath })
					logger.itemSuccess(module.screen.id)
				}
			} catch (error) {
				logger.itemError(`Failed to load ${file}`)
				if (error instanceof Error) {
					logger.log(`    ${logger.dim(error.message)}`)
				}
			}
		}

		// Validate screen references
		const validation = validateScreenReferences(screens)
		if (!validation.valid) {
			logger.blank()
			logger.warn("Invalid screen references found:")
			logger.log(formatValidationErrors(validation.errors))

			if (ctx.values.strict) {
				logger.errorWithHelp(ERRORS.VALIDATION_FAILED(validation.errors.length))
				process.exit(1)
			}
		}

		// Detect circular navigation
		if (!ctx.values.allowCycles) {
			const cycleResult = detectCycles(screens)
			if (cycleResult.hasCycles) {
				logger.blank()
				logger.warn(getCycleSummary(cycleResult))
				logger.log(formatCycleWarnings(cycleResult.cycles))

				if (ctx.values.strict && cycleResult.disallowedCycles.length > 0) {
					logger.blank()
					logger.errorWithHelp(
						ERRORS.CYCLES_DETECTED(cycleResult.disallowedCycles.length),
					)
					process.exit(1)
				}
			}
		}

		// Generate screens.json
		const outputPath = join(cwd, outDir, "screens.json")
		const outputDir = dirname(outputPath)

		if (!existsSync(outputDir)) {
			mkdirSync(outputDir, { recursive: true })
		}

		writeFileSync(outputPath, JSON.stringify(screens, null, 2))
		logger.blank()
		logger.success(`Generated ${logger.path(outputPath)}`)

		// Generate Mermaid graph
		const mermaidPath = join(cwd, outDir, "graph.mmd")
		const mermaidContent = generateMermaidGraph(screens)
		writeFileSync(mermaidPath, mermaidContent)
		logger.success(`Generated ${logger.path(mermaidPath)}`)

		// Generate coverage.json
		const coverage = await generateCoverageData(config, cwd, screens)
		const coveragePath = join(cwd, outDir, "coverage.json")
		writeFileSync(coveragePath, JSON.stringify(coverage, null, 2))
		logger.success(`Generated ${logger.path(coveragePath)}`)
		logger.blank()
		logger.done(
			`Coverage: ${coverage.covered}/${coverage.total} (${coverage.percentage}%)`,
		)
	},
})

async function generateCoverageData(
	config: { routesPattern?: string; metaPattern: string; ignore: string[] },
	cwd: string,
	screens: Array<Screen & { filePath?: string }>,
): Promise<CoverageData> {
	// Get all route files if routesPattern is configured
	let routeFiles: string[] = []
	if (config.routesPattern) {
		routeFiles = await glob(config.routesPattern, {
			cwd,
			ignore: config.ignore,
		})
	}

	// Build a set of directories that have screen.meta.ts
	// Use the actual file paths from loaded screens
	const metaDirs = new Set<string>()
	for (const screen of screens) {
		if (screen.filePath) {
			// Get relative directory from absolute path
			const absoluteDir = dirname(screen.filePath)
			const relativeDir = absoluteDir.startsWith(cwd)
				? absoluteDir.slice(cwd.length + 1)
				: absoluteDir
			metaDirs.add(relativeDir)
		}
	}

	// Find missing routes (routes without screen.meta.ts in the same directory)
	const missing: CoverageData["missing"] = []
	for (const routeFile of routeFiles) {
		const routeDir = dirname(routeFile)

		// Check if there's a screen.meta.ts in the same directory
		if (!metaDirs.has(routeDir)) {
			missing.push({
				route: routeFile,
				suggestedPath: join(dirname(routeFile), "screen.meta.ts"),
			})
		}
	}

	// Calculate coverage
	// When routesPattern is configured, count route files (not screens)
	// This ensures consistency with the lint command
	const total = routeFiles.length > 0 ? routeFiles.length : screens.length
	const covered =
		routeFiles.length > 0 ? routeFiles.length - missing.length : screens.length
	const percentage = total > 0 ? Math.round((covered / total) * 100) : 100

	// Group by owner
	const byOwner: CoverageData["byOwner"] = {}
	for (const screen of screens) {
		const owners = screen.owner || ["unassigned"]
		for (const owner of owners) {
			if (!byOwner[owner]) {
				byOwner[owner] = { count: 0, screens: [] }
			}
			byOwner[owner].count++
			byOwner[owner].screens.push(screen.id)
		}
	}

	// Group by tag
	const byTag: CoverageData["byTag"] = {}
	for (const screen of screens) {
		const tags = screen.tags || []
		for (const tag of tags) {
			byTag[tag] = (byTag[tag] || 0) + 1
		}
	}

	return {
		total,
		covered,
		percentage,
		missing,
		byOwner,
		byTag,
		timestamp: new Date().toISOString(),
	}
}

function generateMermaidGraph(screens: Screen[]): string {
	const lines: string[] = ["flowchart TD"]

	// Create nodes
	for (const screen of screens) {
		const label = screen.title.replace(/"/g, "'")
		lines.push(`    ${sanitizeId(screen.id)}["${label}"]`)
	}

	lines.push("")

	// Create edges from next relationships
	for (const screen of screens) {
		if (screen.next) {
			for (const nextId of screen.next) {
				lines.push(`    ${sanitizeId(screen.id)} --> ${sanitizeId(nextId)}`)
			}
		}
	}

	return lines.join("\n")
}

function sanitizeId(id: string): string {
	return id.replace(/\./g, "_")
}
