import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import type { Screen } from "@screenbook/core"
import { define } from "gunshi"
import { createJiti } from "jiti"
import { glob } from "tinyglobby"
import { loadConfig } from "../utils/config.js"

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
	},
	run: async (ctx) => {
		const config = await loadConfig(ctx.values.config)
		const outDir = ctx.values.outDir ?? config.outDir
		const cwd = process.cwd()

		console.log("Building screen metadata...")

		// Find all screen.meta.ts files
		const files = await glob(config.metaPattern, {
			cwd,
			ignore: config.ignore,
		})

		if (files.length === 0) {
			console.log(
				`No screen.meta.ts files found matching: ${config.metaPattern}`,
			)
			return
		}

		console.log(`Found ${files.length} screen files`)

		// Create jiti instance for loading TypeScript files
		const jiti = createJiti(cwd)

		// Load and collect screen metadata
		const screens: Screen[] = []

		for (const file of files) {
			const absolutePath = resolve(cwd, file)

			try {
				const module = (await jiti.import(absolutePath)) as { screen?: Screen }
				if (module.screen) {
					screens.push(module.screen)
					console.log(`  ✓ ${module.screen.id}`)
				}
			} catch (error) {
				console.error(`  ✗ Failed to load ${file}:`, error)
			}
		}

		// Generate screens.json
		const outputPath = join(cwd, outDir, "screens.json")
		const outputDir = dirname(outputPath)

		if (!existsSync(outputDir)) {
			mkdirSync(outputDir, { recursive: true })
		}

		writeFileSync(outputPath, JSON.stringify(screens, null, 2))
		console.log(`\nGenerated ${outputPath}`)

		// Generate Mermaid graph
		const mermaidPath = join(cwd, outDir, "graph.mmd")
		const mermaidContent = generateMermaidGraph(screens)
		writeFileSync(mermaidPath, mermaidContent)
		console.log(`Generated ${mermaidPath}`)

		// Generate coverage.json
		const coverage = await generateCoverageData(config, cwd, screens)
		const coveragePath = join(cwd, outDir, "coverage.json")
		writeFileSync(coveragePath, JSON.stringify(coverage, null, 2))
		console.log(`Generated ${coveragePath}`)
		console.log(
			`\nCoverage: ${coverage.covered}/${coverage.total} (${coverage.percentage}%)`,
		)
	},
})

async function generateCoverageData(
	config: { routesPattern?: string; metaPattern: string; ignore: string[] },
	cwd: string,
	screens: Screen[],
): Promise<CoverageData> {
	// Get all route files if routesPattern is configured
	let routeFiles: string[] = []
	if (config.routesPattern) {
		routeFiles = await glob(config.routesPattern, {
			cwd,
			ignore: config.ignore,
		})
	}

	// Get directories that have screen.meta.ts
	const metaDirs = new Set(
		screens.map((s) => {
			// Extract directory from route or id
			const parts = s.id.split(".")
			return parts.slice(0, -1).join("/") || parts[0]
		}),
	)

	// Find missing routes (routes without screen.meta.ts)
	const missing: CoverageData["missing"] = []
	for (const routeFile of routeFiles) {
		const routeDir = dirname(routeFile)
		const hasMetaFile = screens.some((s) => {
			// Check if any screen's route matches this route file's directory
			const screenDir = s.id.replace(/\./g, "/")
			return (
				routeDir.includes(screenDir) ||
				screenDir.includes(
					routeDir.replace(/^src\/pages\//, "").replace(/^app\//, ""),
				)
			)
		})

		if (!hasMetaFile) {
			missing.push({
				route: routeFile,
				suggestedPath: join(dirname(routeFile), "screen.meta.ts"),
			})
		}
	}

	// Calculate coverage
	const total = routeFiles.length > 0 ? routeFiles.length : screens.length
	const covered = screens.length
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
