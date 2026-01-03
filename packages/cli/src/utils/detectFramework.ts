import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import prompts from "prompts"

export interface FrameworkInfo {
	name: string
	routesPattern: string
	metaPattern: string
}

interface FrameworkDefinition extends FrameworkInfo {
	packages: string[]
	configFiles: string[]
	/**
	 * Additional check to distinguish variants (e.g., App Router vs Pages Router)
	 */
	check?: (cwd: string) => boolean
}

const FRAMEWORKS: FrameworkDefinition[] = [
	{
		name: "Next.js (App Router)",
		packages: ["next"],
		configFiles: ["next.config.js", "next.config.mjs", "next.config.ts"],
		routesPattern: "app/**/page.tsx",
		metaPattern: "app/**/screen.meta.ts",
		check: (cwd) =>
			existsSync(join(cwd, "app")) || existsSync(join(cwd, "src/app")),
	},
	{
		name: "Next.js (Pages Router)",
		packages: ["next"],
		configFiles: ["next.config.js", "next.config.mjs", "next.config.ts"],
		routesPattern: "pages/**/*.tsx",
		metaPattern: "pages/**/screen.meta.ts",
		check: (cwd) =>
			existsSync(join(cwd, "pages")) || existsSync(join(cwd, "src/pages")),
	},
	{
		name: "Remix",
		packages: ["@remix-run/react", "remix"],
		configFiles: ["remix.config.js", "vite.config.ts"],
		routesPattern: "app/routes/**/*.tsx",
		metaPattern: "app/routes/**/screen.meta.ts",
	},
	{
		name: "Nuxt",
		packages: ["nuxt"],
		configFiles: ["nuxt.config.ts", "nuxt.config.js", "nuxt.config.mjs"],
		routesPattern: "pages/**/*.vue",
		metaPattern: "pages/**/screen.meta.ts",
		check: (cwd) => {
			// Nuxt 4 uses app/pages, Nuxt 3 uses pages
			if (existsSync(join(cwd, "app/pages"))) {
				return false // Will be handled by Nuxt 4 definition
			}
			return existsSync(join(cwd, "pages"))
		},
	},
	{
		name: "Nuxt 4",
		packages: ["nuxt"],
		configFiles: ["nuxt.config.ts", "nuxt.config.js"],
		routesPattern: "app/pages/**/*.vue",
		metaPattern: "app/pages/**/screen.meta.ts",
		check: (cwd) => existsSync(join(cwd, "app/pages")),
	},
	{
		name: "Astro",
		packages: ["astro"],
		configFiles: [
			"astro.config.mjs",
			"astro.config.js",
			"astro.config.ts",
			"astro.config.cjs",
		],
		routesPattern: "src/pages/**/*.astro",
		metaPattern: "src/pages/**/screen.meta.ts",
	},
	{
		name: "SolidStart",
		packages: ["@solidjs/start"],
		configFiles: ["app.config.ts", "app.config.js"],
		routesPattern: "src/routes/**/*.tsx",
		metaPattern: "src/routes/**/screen.meta.ts",
		check: (cwd) => existsSync(join(cwd, "src/routes")),
	},
	{
		name: "QwikCity",
		packages: ["@builder.io/qwik-city"],
		configFiles: ["vite.config.ts", "vite.config.js", "vite.config.mjs"],
		// QwikCity uses index.tsx files as page components (e.g., about/index.tsx not about.tsx)
		routesPattern: "src/routes/**/index.tsx",
		metaPattern: "src/routes/**/screen.meta.ts",
		check: (cwd) => existsSync(join(cwd, "src/routes")),
	},
	{
		name: "TanStack Start",
		packages: ["@tanstack/react-start", "@tanstack/start"],
		configFiles: ["app.config.ts", "app.config.js"],
		routesPattern: "src/routes/**/*.tsx",
		metaPattern: "src/routes/**/screen.meta.ts",
		// TanStack Start requires __root.tsx for file-based routing
		check: (cwd) => existsSync(join(cwd, "src/routes/__root.tsx")),
	},
	{
		name: "Vite + Vue",
		packages: ["vite", "vue"],
		configFiles: ["vite.config.ts", "vite.config.js", "vite.config.mjs"],
		routesPattern: "src/pages/**/*.vue",
		metaPattern: "src/pages/**/screen.meta.ts",
		// Check that react is NOT present to avoid matching React projects
		check: (cwd) => {
			const packageJson = readPackageJson(cwd)
			if (!packageJson) return false
			return !hasPackage(packageJson, "react")
		},
	},
	{
		name: "Vite + React",
		packages: ["vite", "react"],
		configFiles: ["vite.config.ts", "vite.config.js", "vite.config.mjs"],
		routesPattern: "src/pages/**/*.tsx",
		metaPattern: "src/pages/**/screen.meta.ts",
	},
]

interface PackageJson {
	dependencies?: Record<string, string>
	devDependencies?: Record<string, string>
}

function readPackageJson(cwd: string): PackageJson | null {
	const packageJsonPath = join(cwd, "package.json")
	if (!existsSync(packageJsonPath)) {
		return null
	}
	try {
		const content = readFileSync(packageJsonPath, "utf-8")
		return JSON.parse(content)
	} catch (error) {
		console.warn(
			`Warning: Failed to parse package.json at ${packageJsonPath}: ${error instanceof Error ? error.message : String(error)}`,
		)
		return null
	}
}

function hasPackage(packageJson: PackageJson, packageName: string): boolean {
	return !!(
		packageJson.dependencies?.[packageName] ||
		packageJson.devDependencies?.[packageName]
	)
}

function hasConfigFile(cwd: string, configFiles: string[]): boolean {
	return configFiles.some((file) => existsSync(join(cwd, file)))
}

/**
 * Auto-detect the frontend framework in a project directory.
 * Returns framework info if detected, null otherwise.
 */
export function detectFramework(cwd: string): FrameworkInfo | null {
	const packageJson = readPackageJson(cwd)
	if (!packageJson) {
		return null
	}

	for (const framework of FRAMEWORKS) {
		// Check if required packages are present
		const hasRequiredPackage = framework.packages.some((pkg) =>
			hasPackage(packageJson, pkg),
		)
		if (!hasRequiredPackage) {
			continue
		}

		// Check for config files
		const hasConfig = hasConfigFile(cwd, framework.configFiles)
		if (!hasConfig) {
			continue
		}

		// Run additional check if defined
		if (framework.check && !framework.check(cwd)) {
			continue
		}

		return {
			name: framework.name,
			routesPattern: framework.routesPattern,
			metaPattern: framework.metaPattern,
		}
	}

	return null
}

/**
 * Interactive framework selection when auto-detection fails.
 */
export async function promptFrameworkSelection(): Promise<FrameworkInfo | null> {
	const choices = FRAMEWORKS.filter(
		// Remove duplicates (e.g., Nuxt 4 vs Nuxt)
		(fw, idx, arr) =>
			arr.findIndex((f) => f.routesPattern === fw.routesPattern) === idx,
	).map((fw) => ({
		title: fw.name,
		value: fw,
	}))

	choices.push({
		title: "Other (manual configuration)",
		value: null as unknown as FrameworkDefinition,
	})

	const response = await prompts({
		type: "select",
		name: "framework",
		message: "Select your frontend framework:",
		choices,
	})

	if (!response.framework) {
		return null
	}

	return {
		name: response.framework.name,
		routesPattern: response.framework.routesPattern,
		metaPattern: response.framework.metaPattern,
	}
}

/**
 * Detect framework or prompt user if detection fails.
 */
export async function detectOrPromptFramework(
	cwd: string,
): Promise<FrameworkInfo | null> {
	const detected = detectFramework(cwd)
	if (detected) {
		return detected
	}
	return promptFrameworkSelection()
}
