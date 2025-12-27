import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { define } from "gunshi"
import {
	detectFramework,
	type FrameworkInfo,
	promptFrameworkSelection,
} from "../utils/detectFramework.js"

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
	console.log("")
	console.log("What Screenbook gives you:")
	console.log("  - Screen catalog with search & filter")
	console.log("  - Navigation graph visualization")
	console.log("  - Impact analysis (API -> affected screens)")
	console.log("  - CI lint for documentation coverage")
}

function printNextSteps(hasRoutesPattern: boolean): void {
	console.log("")
	console.log("Next steps:")
	if (hasRoutesPattern) {
		console.log(
			"  1. Run 'screenbook generate' to auto-create screen.meta.ts files",
		)
		console.log("  2. Run 'screenbook dev' to start the UI server")
	} else {
		console.log("  1. Configure routesPattern in screenbook.config.ts")
		console.log(
			"  2. Run 'screenbook generate' to auto-create screen.meta.ts files",
		)
		console.log("  3. Run 'screenbook dev' to start the UI server")
	}
	console.log("")
	console.log("screen.meta.ts files are created alongside your route files:")
	console.log("")
	console.log("  src/pages/dashboard/")
	console.log("    page.tsx          # Your route file")
	console.log("    screen.meta.ts    # Auto-generated, customize as needed")
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
	},
	run: async (ctx) => {
		const cwd = process.cwd()
		const force = ctx.values.force ?? false
		const skipDetect = ctx.values.skipDetect ?? false

		console.log("Initializing Screenbook...")
		console.log("")

		// Framework detection
		let framework: FrameworkInfo | null = null

		if (!skipDetect) {
			framework = detectFramework(cwd)

			if (framework) {
				console.log(`  Detected: ${framework.name}`)
			} else {
				console.log("  Could not auto-detect framework")
				console.log("")
				framework = await promptFrameworkSelection()

				if (framework) {
					console.log("")
					console.log(`  Selected: ${framework.name}`)
				}
			}
		}

		// Create screenbook.config.ts
		const configPath = join(cwd, "screenbook.config.ts")
		if (!force && existsSync(configPath)) {
			console.log("  - screenbook.config.ts already exists (skipped)")
		} else {
			const configContent = generateConfigTemplate(framework)
			writeFileSync(configPath, configContent)
			console.log("  + Created screenbook.config.ts")
		}

		// Update .gitignore
		const gitignorePath = join(cwd, ".gitignore")
		const screenbookIgnore = ".screenbook"

		if (existsSync(gitignorePath)) {
			const gitignoreContent = readFileSync(gitignorePath, "utf-8")
			if (!gitignoreContent.includes(screenbookIgnore)) {
				const newContent = `${gitignoreContent.trimEnd()}\n\n# Screenbook\n${screenbookIgnore}\n`
				writeFileSync(gitignorePath, newContent)
				console.log("  + Added .screenbook to .gitignore")
			} else {
				console.log("  - .screenbook already in .gitignore (skipped)")
			}
		} else {
			writeFileSync(gitignorePath, `# Screenbook\n${screenbookIgnore}\n`)
			console.log("  + Created .gitignore with .screenbook")
		}

		console.log("")
		console.log("Screenbook initialized successfully!")

		printValueProposition()
		printNextSteps(framework !== null)
	},
})
