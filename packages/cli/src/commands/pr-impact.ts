import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { Screen } from "@screenbook/core"
import { define } from "gunshi"
import { loadConfig } from "../utils/config.js"
import { ERRORS } from "../utils/errors.js"
import { analyzeImpact, type ImpactResult } from "../utils/impactAnalysis.js"
import { logger, setVerbose } from "../utils/logger.js"
import { extractApiNames, formatMarkdown } from "../utils/prImpact.js"

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
		verbose: {
			type: "boolean",
			short: "v",
			description: "Show detailed output including stack traces",
			default: false,
		},
	},
	run: async (ctx) => {
		setVerbose(ctx.values.verbose)
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
			logger.errorWithHelp(ERRORS.GIT_CHANGED_FILES_ERROR(baseBranch))
			process.exit(1)
		}

		if (changedFiles.length === 0) {
			logger.info("No changed files found.")
			return
		}

		// Extract potential API names from changed files
		const apiNames = extractApiNames(changedFiles)

		if (apiNames.length === 0) {
			if (format === "markdown") {
				logger.log("## Screenbook Impact Analysis")
				logger.blank()
				logger.log("No API-related changes detected in this PR.")
				logger.blank()
				logger.log(`Changed files: ${changedFiles.length}`)
			} else {
				logger.log(
					JSON.stringify({ apis: [], results: [], changedFiles }, null, 2),
				)
			}
			return
		}

		// Load screens.json
		const screensPath = join(cwd, config.outDir, "screens.json")

		if (!existsSync(screensPath)) {
			logger.errorWithHelp(ERRORS.SCREENS_NOT_FOUND)
			process.exit(1)
		}

		let screens: Screen[]
		try {
			const content = readFileSync(screensPath, "utf-8")
			screens = JSON.parse(content) as Screen[]
		} catch (error) {
			logger.errorWithHelp({
				...ERRORS.SCREENS_PARSE_ERROR,
				message: error instanceof Error ? error.message : String(error),
			})
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
			logger.log(
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
			logger.log(formatMarkdown(changedFiles, apiNames, results))
		}
	},
})
