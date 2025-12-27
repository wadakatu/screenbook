import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import type { Screen } from "@screenbook/core"
import { define } from "gunshi"
import { createJiti } from "jiti"
import { glob } from "tinyglobby"
import { loadConfig } from "../utils/config.js"

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
			console.log(`No screen.meta.ts files found matching: ${config.metaPattern}`)
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
	},
})

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
