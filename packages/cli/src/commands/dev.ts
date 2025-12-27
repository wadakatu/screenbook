import { spawn } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import type { Screen } from "@screenbook/core"
import { define } from "gunshi"
import { createJiti } from "jiti"
import { glob } from "tinyglobby"
import { loadConfig } from "../utils/config.js"

export const devCommand = define({
	name: "dev",
	description: "Start the Screenbook development server",
	args: {
		config: {
			type: "string",
			short: "c",
			description: "Path to config file",
		},
		port: {
			type: "string",
			short: "p",
			description: "Port to run the server on",
			default: "4321",
		},
	},
	run: async (ctx) => {
		const config = await loadConfig(ctx.values.config)
		const port = ctx.values.port ?? "4321"
		const cwd = process.cwd()

		console.log("Starting Screenbook development server...")

		// First, build the screen metadata
		await buildScreens(config, cwd)

		// Find the UI package location
		const uiPackagePath = resolveUiPackage()

		if (!uiPackagePath) {
			console.error("Could not find @screenbook/ui package")
			process.exit(1)
		}

		// Copy screens.json to UI package
		const screensJsonPath = join(cwd, config.outDir, "screens.json")
		const uiScreensPath = join(uiPackagePath, ".screenbook", "screens.json")

		if (existsSync(screensJsonPath)) {
			const uiScreensDir = dirname(uiScreensPath)
			if (!existsSync(uiScreensDir)) {
				mkdirSync(uiScreensDir, { recursive: true })
			}
			copyFileSync(screensJsonPath, uiScreensPath)
		}

		// Start Astro dev server
		console.log(`\nStarting UI server on http://localhost:${port}`)

		const astroProcess = spawn("npx", ["astro", "dev", "--port", port], {
			cwd: uiPackagePath,
			stdio: "inherit",
			shell: true,
		})

		astroProcess.on("error", (error) => {
			console.error("Failed to start Astro server:", error)
			process.exit(1)
		})

		astroProcess.on("close", (code) => {
			process.exit(code ?? 0)
		})

		// Handle graceful shutdown
		process.on("SIGINT", () => {
			astroProcess.kill("SIGINT")
		})

		process.on("SIGTERM", () => {
			astroProcess.kill("SIGTERM")
		})
	},
})

async function buildScreens(
	config: { metaPattern: string; outDir: string; ignore: string[] },
	cwd: string,
): Promise<void> {
	const files = await glob(config.metaPattern, {
		cwd,
		ignore: config.ignore,
	})

	if (files.length === 0) {
		console.log(`No screen.meta.ts files found matching: ${config.metaPattern}`)
		return
	}

	console.log(`Found ${files.length} screen files`)

	const jiti = createJiti(cwd)
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

	const outputPath = join(cwd, config.outDir, "screens.json")
	const outputDir = dirname(outputPath)

	if (!existsSync(outputDir)) {
		mkdirSync(outputDir, { recursive: true })
	}

	writeFileSync(outputPath, JSON.stringify(screens, null, 2))
	console.log(`\nGenerated ${outputPath}`)
}

function resolveUiPackage(): string | null {
	// Try to resolve @screenbook/ui from node_modules
	try {
		const require = createRequire(import.meta.url)
		const uiPackageJson = require.resolve("@screenbook/ui/package.json")
		return dirname(uiPackageJson)
	} catch {
		// Fallback: look in common locations
		const possiblePaths = [
			join(process.cwd(), "node_modules", "@screenbook", "ui"),
			join(process.cwd(), "..", "ui"),
			join(process.cwd(), "packages", "ui"),
		]

		for (const p of possiblePaths) {
			if (existsSync(join(p, "package.json"))) {
				return p
			}
		}

		return null
	}
}
