import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { define } from "gunshi"
import { glob } from "tinyglobby"
import { loadConfig } from "../utils/config.js"
import { logger } from "../utils/logger.js"

const CONFIG_FILES = [
	"screenbook.config.ts",
	"screenbook.config.js",
	"screenbook.config.mjs",
]

export interface CheckResult {
	name: string
	status: "pass" | "fail" | "warn"
	message: string
	suggestion?: string
}

interface PackageJson {
	dependencies?: Record<string, string>
	devDependencies?: Record<string, string>
}

export const doctorCommand = define({
	name: "doctor",
	description: "Diagnose common issues with Screenbook setup",
	args: {
		verbose: {
			type: "boolean",
			short: "v",
			description: "Show detailed output",
			default: false,
		},
	},
	run: async (ctx) => {
		const cwd = process.cwd()
		const verbose = ctx.values.verbose

		logger.log("")
		logger.log(logger.bold("Screenbook Doctor"))
		logger.log("─────────────────")
		logger.log("")

		const results: CheckResult[] = []

		// Run all checks
		results.push(await checkConfigFile(cwd))
		results.push(await checkDependencies(cwd))

		// Load config for remaining checks
		const config = await loadConfig()

		results.push(await checkMetaPattern(cwd, config.metaPattern, config.ignore))
		results.push(
			await checkRoutesPattern(cwd, config.routesPattern, config.ignore),
		)
		results.push(await checkBuildOutput(cwd, config.outDir))
		results.push(await checkVersionCompatibility(cwd))
		results.push(await checkGitRepository(cwd))

		// Display results
		displayResults(results, verbose)
	},
})

// Exported for testing
export async function checkConfigFile(cwd: string): Promise<CheckResult> {
	for (const configFile of CONFIG_FILES) {
		const absolutePath = resolve(cwd, configFile)
		if (existsSync(absolutePath)) {
			return {
				name: "Config file",
				status: "pass",
				message: `Found: ${configFile}`,
			}
		}
	}

	return {
		name: "Config file",
		status: "warn",
		message: "No config file found (using defaults)",
		suggestion: "Run 'screenbook init' to create a config file",
	}
}

export async function checkDependencies(cwd: string): Promise<CheckResult> {
	const packageJsonPath = join(cwd, "package.json")

	if (!existsSync(packageJsonPath)) {
		return {
			name: "Dependencies",
			status: "fail",
			message: "package.json not found",
			suggestion: "Run 'npm init' or 'pnpm init' to create package.json",
		}
	}

	try {
		const content = readFileSync(packageJsonPath, "utf-8")
		const pkg = JSON.parse(content) as PackageJson

		const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
		const unifiedVersion = allDeps.screenbook
		const coreVersion = allDeps["@screenbook/core"]
		const cliVersion = allDeps["@screenbook/cli"]

		// Check for unified screenbook package first
		if (unifiedVersion) {
			return {
				name: "Dependencies",
				status: "pass",
				message: `screenbook@${unifiedVersion}`,
			}
		}

		if (!coreVersion && !cliVersion) {
			return {
				name: "Dependencies",
				status: "fail",
				message: "Screenbook packages not installed",
				suggestion:
					"Run 'pnpm add -D screenbook' or 'pnpm add -D @screenbook/core @screenbook/cli' to install",
			}
		}

		if (!coreVersion) {
			return {
				name: "Dependencies",
				status: "warn",
				message: "@screenbook/core not found in dependencies",
				suggestion: "Run 'pnpm add -D @screenbook/core' to install",
			}
		}

		if (!cliVersion) {
			return {
				name: "Dependencies",
				status: "warn",
				message: "@screenbook/cli not found in dependencies",
				suggestion: "Run 'pnpm add -D @screenbook/cli' to install",
			}
		}

		return {
			name: "Dependencies",
			status: "pass",
			message: `@screenbook/core@${coreVersion}, @screenbook/cli@${cliVersion}`,
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		return {
			name: "Dependencies",
			status: "fail",
			message: `Failed to read package.json: ${errorMessage}`,
			suggestion: "Ensure package.json is valid JSON",
		}
	}
}

export async function checkMetaPattern(
	cwd: string,
	metaPattern: string,
	ignore: string[],
): Promise<CheckResult> {
	try {
		const files = await glob(metaPattern, { cwd, ignore })

		if (files.length === 0) {
			return {
				name: "Screen meta files",
				status: "warn",
				message: `No files matching: ${metaPattern}`,
				suggestion: "Run 'screenbook generate' to create screen.meta.ts files",
			}
		}

		return {
			name: "Screen meta files",
			status: "pass",
			message: `Found ${files.length} screen.meta.ts file${files.length > 1 ? "s" : ""}`,
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		return {
			name: "Screen meta files",
			status: "fail",
			message: `Invalid pattern: ${metaPattern} (${errorMessage})`,
			suggestion: "Check metaPattern in your config file",
		}
	}
}

export async function checkRoutesPattern(
	cwd: string,
	routesPattern: string | undefined,
	ignore: string[],
): Promise<CheckResult> {
	if (!routesPattern) {
		return {
			name: "Routes pattern",
			status: "warn",
			message: "routesPattern not configured",
			suggestion:
				"Set routesPattern in config to enable 'lint' and 'generate' commands",
		}
	}

	try {
		const files = await glob(routesPattern, { cwd, ignore })

		if (files.length === 0) {
			return {
				name: "Routes pattern",
				status: "warn",
				message: `No files matching: ${routesPattern}`,
				suggestion: "Check routesPattern in your config file",
			}
		}

		return {
			name: "Routes pattern",
			status: "pass",
			message: `Found ${files.length} route file${files.length > 1 ? "s" : ""}`,
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		return {
			name: "Routes pattern",
			status: "fail",
			message: `Invalid pattern: ${routesPattern} (${errorMessage})`,
			suggestion: "Check routesPattern in your config file",
		}
	}
}

export async function checkBuildOutput(
	cwd: string,
	outDir: string,
): Promise<CheckResult> {
	const screensJsonPath = join(cwd, outDir, "screens.json")

	if (!existsSync(screensJsonPath)) {
		return {
			name: "Build output",
			status: "fail",
			message: `screens.json not found in ${outDir}/`,
			suggestion: "Run 'screenbook build' to generate metadata",
		}
	}

	try {
		const content = readFileSync(screensJsonPath, "utf-8")
		const screens = JSON.parse(content) as unknown[]

		return {
			name: "Build output",
			status: "pass",
			message: `screens.json contains ${screens.length} screen${screens.length > 1 ? "s" : ""}`,
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		return {
			name: "Build output",
			status: "fail",
			message: `screens.json is corrupted: ${errorMessage}`,
			suggestion: "Run 'screenbook build' to regenerate",
		}
	}
}

export async function checkVersionCompatibility(
	cwd: string,
): Promise<CheckResult> {
	const packageJsonPath = join(cwd, "package.json")

	if (!existsSync(packageJsonPath)) {
		return {
			name: "Version compatibility",
			status: "warn",
			message: "Cannot check - package.json not found",
		}
	}

	try {
		const content = readFileSync(packageJsonPath, "utf-8")
		const pkg = JSON.parse(content) as PackageJson

		const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
		const unifiedVersion = allDeps.screenbook
		const coreVersion = allDeps["@screenbook/core"]
		const cliVersion = allDeps["@screenbook/cli"]

		// Unified package - no compatibility check needed
		if (unifiedVersion) {
			return {
				name: "Version compatibility",
				status: "pass",
				message: "Using unified screenbook package",
			}
		}

		if (!coreVersion || !cliVersion) {
			return {
				name: "Version compatibility",
				status: "warn",
				message: "Cannot check - packages not installed",
			}
		}

		// Extract major version (handle ^, ~, etc.)
		const extractMajor = (version: string): string => {
			const cleaned = version.replace(/^[\^~>=<]+/, "")
			return cleaned.split(".")[0] ?? "0"
		}

		const coreMajor = extractMajor(coreVersion)
		const cliMajor = extractMajor(cliVersion)

		if (coreMajor !== cliMajor) {
			return {
				name: "Version compatibility",
				status: "warn",
				message: `Major version mismatch: core@${coreVersion} vs cli@${cliVersion}`,
				suggestion: "Update packages to matching major versions",
			}
		}

		return {
			name: "Version compatibility",
			status: "pass",
			message: "Package versions are compatible",
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		return {
			name: "Version compatibility",
			status: "fail",
			message: `Failed to read package.json: ${errorMessage}`,
			suggestion: "Ensure package.json is valid JSON",
		}
	}
}

export async function checkGitRepository(cwd: string): Promise<CheckResult> {
	const gitDir = join(cwd, ".git")

	if (!existsSync(gitDir)) {
		return {
			name: "Git repository",
			status: "warn",
			message: "Not a git repository",
			suggestion:
				"Run 'git init' to enable 'pr-impact' command for PR analysis",
		}
	}

	return {
		name: "Git repository",
		status: "pass",
		message: "Git repository detected",
	}
}

function displayResults(results: CheckResult[], verbose: boolean): void {
	let passCount = 0
	let failCount = 0
	let warnCount = 0

	for (const result of results) {
		const icon =
			result.status === "pass"
				? logger.green("✓")
				: result.status === "fail"
					? logger.red("✗")
					: logger.yellow("⚠")

		const statusColor =
			result.status === "pass"
				? logger.green
				: result.status === "fail"
					? logger.red
					: logger.yellow

		logger.log(`${icon} ${statusColor(result.name)}: ${result.message}`)

		if (result.suggestion && (result.status !== "pass" || verbose)) {
			logger.log(`  ${logger.dim("→")} ${result.suggestion}`)
		}

		if (result.status === "pass") passCount++
		else if (result.status === "fail") failCount++
		else warnCount++
	}

	logger.log("")

	const summary: string[] = []
	if (passCount > 0) summary.push(logger.green(`${passCount} passed`))
	if (failCount > 0) summary.push(logger.red(`${failCount} failed`))
	if (warnCount > 0) summary.push(logger.yellow(`${warnCount} warnings`))

	logger.log(`Summary: ${summary.join(", ")}`)

	if (failCount > 0) {
		logger.log("")
		logger.log(
			logger.dim("Run the suggested commands above to fix the issues."),
		)
	}
}
