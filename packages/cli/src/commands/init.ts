import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { define } from "gunshi"

const CONFIG_TEMPLATE = `import { defineConfig } from "@screenbook/core"

export default defineConfig({
	// Glob pattern for screen metadata files (supports colocation)
	metaPattern: "src/**/screen.meta.ts",

	// Glob pattern for route files (for generate/lint commands)
	// Uncomment and adjust for your framework:
	// routesPattern: "src/pages/**/page.tsx",   // Vite/React
	// routesPattern: "app/**/page.tsx",         // Next.js App Router
	// routesPattern: "src/pages/**/*.vue",      // Vue/Nuxt

	// Output directory for generated files
	outDir: ".screenbook",
})
`

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
	},
	run: async (ctx) => {
		const cwd = process.cwd()
		const force = ctx.values.force ?? false

		console.log("Initializing Screenbook...")
		console.log("")

		// Create screenbook.config.ts
		const configPath = join(cwd, "screenbook.config.ts")
		if (!force && existsSync(configPath)) {
			console.log("  - screenbook.config.ts already exists (skipped)")
		} else {
			writeFileSync(configPath, CONFIG_TEMPLATE)
			console.log("  + Created screenbook.config.ts")
		}

		// Note: We don't create example files anymore
		// Users should run `screenbook generate` to auto-scaffold from their routes

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
		console.log("")
		console.log("Next steps:")
		console.log("  1. Configure routesPattern in screenbook.config.ts")
		console.log("  2. Run 'screenbook generate' to auto-create screen.meta.ts files")
		console.log("  3. Run 'screenbook dev' to start the UI server")
		console.log("")
		console.log("screen.meta.ts files are created alongside your route files:")
		console.log("")
		console.log("  src/pages/dashboard/")
		console.log("  ├── page.tsx          # Your route file")
		console.log("  └── screen.meta.ts    # Auto-generated, customize as needed")
	},
})
