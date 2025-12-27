import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { define } from "gunshi"

const CONFIG_TEMPLATE = `import { defineConfig } from "@screenbook/core"

export default defineConfig({
	// Directory containing screen files
	screensDir: "src/screens",

	// Output directory for generated files
	outDir: ".screenbook",

	// Glob pattern for screen metadata files
	metaPattern: "**/screen.meta.ts",

	// Glob pattern for route files (for lint command)
	// routesPattern: "src/pages/**/*.vue",  // for Vue
	// routesPattern: "app/**/page.tsx",     // for Next.js App Router
	// routesPattern: "src/routes/**/*.tsx", // for React Router
})
`

const EXAMPLE_SCREEN_TEMPLATE = `import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "home",
	title: "Home",
	route: "/",
	owner: ["team-name"],
	tags: ["landing"],
	description: "The main landing page of the application",
	next: [],
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

		// Create example screen directory and file
		const screensDir = join(cwd, "src", "screens", "home")
		const exampleScreenPath = join(screensDir, "screen.meta.ts")

		if (!force && existsSync(exampleScreenPath)) {
			console.log("  - Example screen already exists (skipped)")
		} else {
			mkdirSync(screensDir, { recursive: true })
			writeFileSync(exampleScreenPath, EXAMPLE_SCREEN_TEMPLATE)
			console.log("  + Created src/screens/home/screen.meta.ts")
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
		console.log("")
		console.log("Next steps:")
		console.log("  1. Run 'screenbook build' to generate screen metadata")
		console.log("  2. Run 'screenbook dev' to start the UI server")
		console.log("")
		console.log("Add more screens by creating screen.meta.ts files:")
		console.log("")
		console.log("  // src/screens/dashboard/screen.meta.ts")
		console.log('  import { defineScreen } from "@screenbook/core"')
		console.log("")
		console.log("  export const screen = defineScreen({")
		console.log('    id: "dashboard",')
		console.log('    title: "Dashboard",')
		console.log('    route: "/dashboard",')
		console.log("  })")
	},
})
