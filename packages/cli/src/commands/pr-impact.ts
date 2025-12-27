import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { basename, dirname, join } from "node:path"
import type { Screen } from "@screenbook/core"
import { define } from "gunshi"
import { loadConfig } from "../utils/config.js"
import { analyzeImpact, type ImpactResult } from "../utils/impactAnalysis.js"

export const prImpactCommand = define({
	name: "pr-impact",
	description: "Analyze impact of changed files in a PR",
	args: {
		base: {
			type: "string",
			short: "b",
			description: "Base branch to compare against (default: main)",
			default: "main",
		},
		config: {
			type: "string",
			short: "c",
			description: "Path to config file",
		},
		format: {
			type: "string",
			short: "f",
			description: "Output format: markdown (default) or json",
			default: "markdown",
		},
		depth: {
			type: "number",
			short: "d",
			description: "Maximum depth for transitive dependencies",
			default: 3,
		},
	},
	run: async (ctx) => {
		const config = await loadConfig(ctx.values.config)
		const cwd = process.cwd()

		const baseBranch = ctx.values.base ?? "main"
		const format = ctx.values.format ?? "markdown"
		const depth = ctx.values.depth ?? 3

		// Get changed files from git
		let changedFiles: string[]
		try {
			const gitOutput = execSync(
				`git diff --name-only ${baseBranch}...HEAD 2>/dev/null || git diff --name-only ${baseBranch} HEAD`,
				{ cwd, encoding: "utf-8" },
			)
			changedFiles = gitOutput
				.split("\n")
				.map((f) => f.trim())
				.filter((f) => f.length > 0)
		} catch {
			console.error("Error: Failed to get changed files from git")
			console.error("")
			console.error(
				"Make sure you are in a git repository and the base branch exists.",
			)
			console.error(`Base branch: ${baseBranch}`)
			process.exit(1)
		}

		if (changedFiles.length === 0) {
			console.log("No changed files found.")
			return
		}

		// Extract potential API names from changed files
		const apiNames = extractApiNames(changedFiles)

		if (apiNames.length === 0) {
			if (format === "markdown") {
				console.log("## Screenbook Impact Analysis")
				console.log("")
				console.log("No API-related changes detected in this PR.")
				console.log("")
				console.log(`Changed files: ${changedFiles.length}`)
			} else {
				console.log(
					JSON.stringify({ apis: [], results: [], changedFiles }, null, 2),
				)
			}
			return
		}

		// Load screens.json
		const screensPath = join(cwd, config.outDir, "screens.json")

		if (!existsSync(screensPath)) {
			console.error("Error: screens.json not found")
			console.error("")
			console.error(
				"Run 'screenbook build' first to generate the screen catalog.",
			)
			process.exit(1)
		}

		let screens: Screen[]
		try {
			const content = readFileSync(screensPath, "utf-8")
			screens = JSON.parse(content) as Screen[]
		} catch (error) {
			console.error("Error: Failed to read screens.json")
			console.error(error instanceof Error ? error.message : String(error))
			process.exit(1)
		}

		// Analyze impact for each API
		const results: ImpactResult[] = []
		for (const apiName of apiNames) {
			const result = analyzeImpact(screens, apiName, depth)
			if (result.totalCount > 0) {
				results.push(result)
			}
		}

		// Output results
		if (format === "json") {
			console.log(
				JSON.stringify(
					{
						changedFiles,
						detectedApis: apiNames,
						results: results.map((r) => ({
							api: r.api,
							directCount: r.direct.length,
							transitiveCount: r.transitive.length,
							totalCount: r.totalCount,
							direct: r.direct.map((s) => ({
								id: s.id,
								title: s.title,
								route: s.route,
								owner: s.owner,
							})),
							transitive: r.transitive.map(({ screen, path }) => ({
								id: screen.id,
								title: screen.title,
								route: screen.route,
								path,
							})),
						})),
					},
					null,
					2,
				),
			)
		} else {
			console.log(formatMarkdown(changedFiles, apiNames, results))
		}
	},
})

/**
 * Extract potential API names from changed file paths.
 * Looks for common API file patterns.
 */
function extractApiNames(files: string[]): string[] {
	const apis = new Set<string>()

	for (const file of files) {
		const fileName = basename(file, ".ts")
			.replace(/\.tsx?$/, "")
			.replace(/\.js$/, "")
			.replace(/\.jsx?$/, "")

		const dirName = basename(dirname(file))

		// Pattern: src/api/InvoiceAPI.ts -> InvoiceAPI
		if (
			file.includes("/api/") ||
			file.includes("/apis/") ||
			file.includes("/services/")
		) {
			if (
				fileName.endsWith("API") ||
				fileName.endsWith("Api") ||
				fileName.endsWith("Service")
			) {
				apis.add(fileName)
			}
		}

		// Pattern: src/services/invoice/index.ts -> InvoiceService
		if (
			file.includes("/services/") &&
			(fileName === "index" || fileName === dirName)
		) {
			const serviceName = capitalize(dirName) + "Service"
			apis.add(serviceName)
		}

		// Pattern: src/api/invoice.ts -> InvoiceAPI
		if (file.includes("/api/") || file.includes("/apis/")) {
			if (!fileName.endsWith("API") && !fileName.endsWith("Api")) {
				const apiName = capitalize(fileName) + "API"
				apis.add(apiName)
			}
		}

		// Pattern: explicit API/Service file names
		if (
			fileName.toLowerCase().includes("api") ||
			fileName.toLowerCase().includes("service")
		) {
			apis.add(fileName)
		}
	}

	return Array.from(apis).sort()
}

function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Format the results as Markdown for PR comments.
 */
function formatMarkdown(
	changedFiles: string[],
	detectedApis: string[],
	results: ImpactResult[],
): string {
	const lines: string[] = []

	lines.push("## Screenbook Impact Analysis")
	lines.push("")

	if (results.length === 0) {
		lines.push("No screen impacts detected from the API changes in this PR.")
		lines.push("")
		lines.push("<details>")
		lines.push("<summary>Detected APIs (no screen dependencies)</summary>")
		lines.push("")
		for (const api of detectedApis) {
			lines.push(`- \`${api}\``)
		}
		lines.push("")
		lines.push("</details>")
		return lines.join("\n")
	}

	// Summary
	const totalDirect = results.reduce((sum, r) => sum + r.direct.length, 0)
	const totalTransitive = results.reduce(
		(sum, r) => sum + r.transitive.length,
		0,
	)
	const totalScreens = totalDirect + totalTransitive

	lines.push(
		`**${totalScreens} screen${totalScreens > 1 ? "s" : ""} affected** by changes to ${results.length} API${results.length > 1 ? "s" : ""}`,
	)
	lines.push("")

	// Per-API breakdown
	for (const result of results) {
		lines.push(`### ${result.api}`)
		lines.push("")

		if (result.direct.length > 0) {
			lines.push(`**Direct dependencies** (${result.direct.length}):`)
			lines.push("")
			lines.push("| Screen | Route | Owner |")
			lines.push("|--------|-------|-------|")
			for (const screen of result.direct) {
				const owner = screen.owner?.join(", ") ?? "-"
				lines.push(`| ${screen.id} | \`${screen.route}\` | ${owner} |`)
			}
			lines.push("")
		}

		if (result.transitive.length > 0) {
			lines.push(`**Transitive dependencies** (${result.transitive.length}):`)
			lines.push("")
			for (const { screen, path } of result.transitive) {
				lines.push(`- ${path.join(" → ")}`)
			}
			lines.push("")
		}
	}

	// Changed files summary
	lines.push("<details>")
	lines.push(`<summary>Changed files (${changedFiles.length})</summary>`)
	lines.push("")
	for (const file of changedFiles.slice(0, 20)) {
		lines.push(`- \`${file}\``)
	}
	if (changedFiles.length > 20) {
		lines.push(`- ... and ${changedFiles.length - 20} more`)
	}
	lines.push("")
	lines.push("</details>")

	return lines.join("\n")
}
