import { spawn } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import type { Screen } from "@screenbook/core"
import { define } from "gunshi"
import { createJiti } from "jiti"
import { glob } from "tinyglobby"
import { loadConfig } from "../utils/config.js"
import { ERRORS } from "../utils/errors.js"
import { logger } from "../utils/logger.js"

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

		logger.info("Starting Screenbook development server...")

		// First, build the screen metadata
		await buildScreens(config, cwd)

		// Find the UI package location
		const uiPackagePath = resolveUiPackage()

		if (!uiPackagePath) {
			logger.errorWithHelp({
				title: "Could not find @screenbook/ui package",
				suggestion:
					"Make sure @screenbook/ui is installed. Run 'npm install @screenbook/ui' or 'pnpm add @screenbook/ui'.",
			})
			process.exit(1)
		}

		// Copy screens.json and coverage.json to UI package
		const screensJsonPath = join(cwd, config.outDir, "screens.json")
		const coverageJsonPath = join(cwd, config.outDir, "coverage.json")
		const uiScreensDir = join(uiPackagePath, ".screenbook")

		if (!existsSync(uiScreensDir)) {
			mkdirSync(uiScreensDir, { recursive: true })
		}

		if (existsSync(screensJsonPath)) {
			copyFileSync(screensJsonPath, join(uiScreensDir, "screens.json"))
		}

		if (existsSync(coverageJsonPath)) {
			copyFileSync(coverageJsonPath, join(uiScreensDir, "coverage.json"))
		}

		// Start Astro dev server
		logger.blank()
		logger.info(
			`Starting UI server on ${logger.highlight(`http://localhost:${port}`)}`,
		)

		const astroProcess = spawn("npx", ["astro", "dev", "--port", port], {
			cwd: uiPackagePath,
			stdio: "inherit",
			shell: true,
		})

		astroProcess.on("error", (error) => {
			logger.errorWithHelp(ERRORS.SERVER_START_FAILED(error.message))
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

export async function buildScreens(
	config: { metaPattern: string; outDir: string; ignore: string[] },
	cwd: string,
): Promise<void> {
	const files = await glob(config.metaPattern, {
		cwd,
		ignore: config.ignore,
	})

	if (files.length === 0) {
		logger.warn(`No screen.meta.ts files found matching: ${config.metaPattern}`)
		return
	}

	logger.info(`Found ${files.length} screen files`)

	// Extended screen type with file path (for internal use)
	type ScreenWithFilePath = Screen & { filePath: string }

	const jiti = createJiti(cwd)
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

	const outputPath = join(cwd, config.outDir, "screens.json")
	const outputDir = dirname(outputPath)

	if (!existsSync(outputDir)) {
		mkdirSync(outputDir, { recursive: true })
	}

	writeFileSync(outputPath, JSON.stringify(screens, null, 2))
	logger.blank()
	logger.success(`Generated ${logger.path(outputPath)}`)
}

export function resolveUiPackage(): string | null {
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
