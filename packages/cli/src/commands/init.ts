import { spawn } from "node:child_process"
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import type { Screen } from "@screenbook/core"
import { define } from "gunshi"
import { createJiti } from "jiti"
import prompts from "prompts"
import { glob } from "tinyglobby"
import {
	detectFramework,
	type FrameworkInfo,
	promptFrameworkSelection,
} from "../utils/detectFramework.js"
import { isInteractive } from "../utils/isInteractive.js"
import { logger } from "../utils/logger.js"
import {
	type GenerateFromRoutesPatternOptions,
	generateFromRoutesPattern,
} from "./generate.js"

function generateConfigTemplate(framework: FrameworkInfo | null): string {
	if (framework) {
		return `import { defineConfig } from "@screenbook/core"

export default defineConfig({
	// Auto-detected: ${framework.name}
	metaPattern: "${framework.metaPattern}",
	routesPattern: "${framework.routesPattern}",
	outDir: ".screenbook",
})
`
	}

	// Fallback template when no framework detected
	return `import { defineConfig } from "@screenbook/core"

export default defineConfig({
	// Glob pattern for screen metadata files
	metaPattern: "src/**/screen.meta.ts",

	// Glob pattern for route files (uncomment and adjust for your framework):
	// routesPattern: "src/pages/**/page.tsx",   // Vite/React
	// routesPattern: "app/**/page.tsx",         // Next.js App Router
	// routesPattern: "pages/**/*.tsx",          // Next.js Pages Router
	// routesPattern: "app/routes/**/*.tsx",     // Remix
	// routesPattern: "pages/**/*.vue",          // Nuxt
	// routesPattern: "src/pages/**/*.astro",    // Astro

	outDir: ".screenbook",
})
`
}

function printValueProposition(): void {
	logger.blank()
	logger.log(logger.bold("What Screenbook gives you:"))
	logger.log("  - Screen catalog with search & filter")
	logger.log("  - Navigation graph visualization")
	logger.log("  - Impact analysis (API -> affected screens)")
	logger.log("  - CI lint for documentation coverage")
}

function printNextSteps(hasRoutesPattern: boolean): void {
	logger.blank()
	logger.log(logger.bold("Next steps:"))
	if (hasRoutesPattern) {
		logger.log(
			`  1. Run ${logger.code("screenbook generate")} to auto-create screen.meta.ts files`,
		)
		logger.log(
			`  2. Run ${logger.code("screenbook dev")} to start the UI server`,
		)
	} else {
		logger.log("  1. Configure routesPattern in screenbook.config.ts")
		logger.log(
			`  2. Run ${logger.code("screenbook generate")} to auto-create screen.meta.ts files`,
		)
		logger.log(
			`  3. Run ${logger.code("screenbook dev")} to start the UI server`,
		)
	}
	logger.blank()
	logger.log("screen.meta.ts files are created alongside your route files:")
	logger.blank()
	logger.log(logger.dim("  src/pages/dashboard/"))
	logger.log(logger.dim("    page.tsx          # Your route file"))
	logger.log(
		logger.dim("    screen.meta.ts    # Auto-generated, customize as needed"),
	)
}

export interface ResolveOptionParams {
	explicitValue: boolean | undefined
	yesAll: boolean
	ciMode: boolean
	ciDefault: boolean
	promptMessage: string
}

/**
 * Resolve a boolean option with priority order:
 * 1. Explicit flag (e.g., --generate or --no-generate) takes precedence
 * 2. -y flag enables all optional features
 * 3. Non-interactive environments (CI mode or no TTY) fall back to ciDefault
 * 4. Otherwise, prompt the user interactively
 */
export async function resolveOption(
	params: ResolveOptionParams,
): Promise<boolean> {
	const { explicitValue, yesAll, ciMode, ciDefault, promptMessage } = params

	// Priority 1: Explicit flag takes precedence
	if (explicitValue !== undefined) {
		return explicitValue
	}

	// Priority 2: -y flag answers yes to all
	if (yesAll) {
		return true
	}

	// Priority 3: Non-interactive environments use ciDefault
	if (ciMode || !isInteractive()) {
		return ciDefault
	}

	// Priority 4: Interactive prompt
	const response = await prompts({
		type: "confirm",
		name: "value",
		message: promptMessage,
		initial: true,
	})

	// Handle user cancellation (Ctrl+C)
	if (response.value === undefined) {
		logger.blank()
		logger.info("Operation cancelled")
		process.exit(0)
	}

	return response.value
}

async function countRouteFiles(
	routesPattern: string,
	cwd: string,
): Promise<number> {
	const files = await glob(routesPattern, { cwd })
	return files.length
}

async function runGenerate(routesPattern: string, cwd: string): Promise<void> {
	const options: GenerateFromRoutesPatternOptions = {
		dryRun: false,
		force: false,
		interactive: false,
		ignore: ["**/node_modules/**"],
	}

	await generateFromRoutesPattern(routesPattern, cwd, options)
}

async function buildScreensForDev(
	metaPattern: string,
	outDir: string,
	cwd: string,
): Promise<void> {
	const files = await glob(metaPattern, {
		cwd,
		ignore: ["**/node_modules/**"],
	})

	if (files.length === 0) {
		logger.warn(`No screen.meta.ts files found matching: ${metaPattern}`)
		return
	}

	type ScreenWithFilePath = Screen & { filePath: string }

	const jiti = createJiti(cwd)
	const screens: ScreenWithFilePath[] = []

	for (const file of files) {
		const absolutePath = resolve(cwd, file)

		try {
			const module = (await jiti.import(absolutePath)) as { screen?: Screen }
			if (module.screen) {
				screens.push({ ...module.screen, filePath: absolutePath })
			}
		} catch (error) {
			// Log failed files so users can diagnose issues
			logger.itemWarn(`Failed to load ${file}`)
			if (error instanceof Error) {
				logger.log(`    ${logger.dim(error.message)}`)
			}
		}
	}

	const outputPath = join(cwd, outDir, "screens.json")
	const outputDir = dirname(outputPath)

	if (!existsSync(outputDir)) {
		mkdirSync(outputDir, { recursive: true })
	}

	writeFileSync(outputPath, JSON.stringify(screens, null, 2))
}

function resolveUiPackage(): string | null {
	try {
		const require = createRequire(import.meta.url)
		const uiPackageJson = require.resolve("@screenbook/ui/package.json")
		return dirname(uiPackageJson)
	} catch {
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

async function startDevServer(
	metaPattern: string,
	outDir: string,
	cwd: string,
	port: string,
): Promise<void> {
	// Build screens first
	await buildScreensForDev(metaPattern, outDir, cwd)

	// Find the UI package
	const uiPackagePath = resolveUiPackage()

	if (!uiPackagePath) {
		logger.warn("Could not find @screenbook/ui package")
		logger.log(
			`  Run ${logger.code("npm install @screenbook/ui")} to install it`,
		)
		return
	}

	// Copy screens.json to UI package
	const screensJsonPath = join(cwd, outDir, "screens.json")
	const uiScreensDir = join(uiPackagePath, ".screenbook")

	if (!existsSync(uiScreensDir)) {
		mkdirSync(uiScreensDir, { recursive: true })
	}

	if (existsSync(screensJsonPath)) {
		copyFileSync(screensJsonPath, join(uiScreensDir, "screens.json"))
	}

	// Start Astro dev server
	logger.blank()
	logger.info(
		`Starting UI server on ${logger.highlight(`http://localhost:${port}`)}`,
	)
	logger.blank()

	const astroProcess = spawn("npx", ["astro", "dev", "--port", port], {
		cwd: uiPackagePath,
		stdio: "inherit",
		shell: true,
	})

	astroProcess.on("error", (error) => {
		logger.error(`Failed to start server: ${error.message}`)
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
}

export const initCommand = define({
	name: "init",
	description: "Initialize Screenbook in a project",
	args: {
		force: {
			type: "boolean",
			short: "f",
			description: "Overwrite existing files",
			default: false,
		},
		skipDetect: {
			type: "boolean",
			description: "Skip framework auto-detection",
			default: false,
		},
		generate: {
			type: "boolean",
			description: "Auto-generate screen.meta.ts files (--no-generate to skip)",
			default: undefined,
		},
		dev: {
			type: "boolean",
			description: "Start development server after init (--no-dev to skip)",
			default: undefined,
		},
		yes: {
			type: "boolean",
			short: "y",
			description: "Answer yes to all prompts",
			default: false,
		},
		ci: {
			type: "boolean",
			description: "CI mode (no prompts, generate only)",
			default: false,
		},
		port: {
			type: "string",
			short: "p",
			description: "Port for the dev server",
			default: "4321",
		},
	},
	run: async (ctx) => {
		const cwd = process.cwd()
		const force = ctx.values.force ?? false
		const skipDetect = ctx.values.skipDetect ?? false
		const generateFlag = ctx.values.generate
		const devFlag = ctx.values.dev
		const yesAll = ctx.values.yes ?? false
		const ciMode = ctx.values.ci ?? false
		const port = ctx.values.port ?? "4321"

		logger.info("Initializing Screenbook...")
		logger.blank()

		// Framework detection
		let framework: FrameworkInfo | null = null

		if (!skipDetect) {
			framework = detectFramework(cwd)

			if (framework) {
				logger.itemSuccess(`Detected: ${framework.name}`)
			} else {
				logger.log("  Could not auto-detect framework")

				// Only prompt for framework selection in interactive mode
				if (!ciMode && isInteractive()) {
					logger.blank()
					framework = await promptFrameworkSelection()

					if (framework) {
						logger.blank()
						logger.itemSuccess(`Selected: ${framework.name}`)
					}
				}
			}
		}

		// Create screenbook.config.ts
		const configPath = join(cwd, "screenbook.config.ts")
		if (!force && existsSync(configPath)) {
			logger.log(
				`  ${logger.dim("-")} screenbook.config.ts already exists ${logger.dim("(skipped)")}`,
			)
		} else {
			const configContent = generateConfigTemplate(framework)
			writeFileSync(configPath, configContent)
			logger.itemSuccess("Created screenbook.config.ts")
		}

		// Update .gitignore
		const gitignorePath = join(cwd, ".gitignore")
		const screenbookIgnore = ".screenbook"

		if (existsSync(gitignorePath)) {
			const gitignoreContent = readFileSync(gitignorePath, "utf-8")
			if (!gitignoreContent.includes(screenbookIgnore)) {
				const newContent = `${gitignoreContent.trimEnd()}\n\n# Screenbook\n${screenbookIgnore}\n`
				writeFileSync(gitignorePath, newContent)
				logger.itemSuccess("Added .screenbook to .gitignore")
			} else {
				logger.log(
					`  ${logger.dim("-")} .screenbook already in .gitignore ${logger.dim("(skipped)")}`,
				)
			}
		} else {
			writeFileSync(gitignorePath, `# Screenbook\n${screenbookIgnore}\n`)
			logger.itemSuccess("Created .gitignore with .screenbook")
		}

		logger.blank()
		logger.done("Screenbook initialized successfully!")

		// If no framework detected or no routesPattern, show traditional next steps
		if (!framework?.routesPattern) {
			printValueProposition()
			printNextSteps(false)
			return
		}

		// Count route files
		const routeFileCount = await countRouteFiles(framework.routesPattern, cwd)

		if (routeFileCount === 0) {
			printValueProposition()
			printNextSteps(true)
			return
		}

		// Prompt for generate
		logger.blank()
		const shouldGenerate = await resolveOption({
			explicitValue: generateFlag,
			yesAll,
			ciMode,
			ciDefault: true,
			promptMessage: `Found ${routeFileCount} route files. Generate screen.meta.ts files?`,
		})

		if (!shouldGenerate) {
			printValueProposition()
			printNextSteps(true)
			return
		}

		// Run generate
		logger.blank()
		logger.info("Generating screen metadata...")
		logger.blank()

		await runGenerate(framework.routesPattern, cwd)

		// In CI mode, skip dev server
		if (ciMode) {
			logger.blank()
			logger.done("Initialization complete!")
			return
		}

		// Prompt for dev server
		logger.blank()
		const shouldDev = await resolveOption({
			explicitValue: devFlag,
			yesAll,
			ciMode,
			ciDefault: false,
			promptMessage: "Start the development server?",
		})

		if (!shouldDev) {
			logger.blank()
			logger.log(logger.bold("Next step:"))
			logger.log(
				`  Run ${logger.code("screenbook dev")} to start the UI server`,
			)
			return
		}

		// Start dev server
		logger.blank()
		logger.info("Starting development server...")

		await startDevServer(framework.metaPattern, ".screenbook", cwd, port)
	},
})
