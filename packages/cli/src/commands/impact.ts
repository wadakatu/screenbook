import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { Screen } from "@screenbook/core"
import { define } from "gunshi"
import { loadConfig } from "../utils/config.js"
import { ERRORS } from "../utils/errors.js"
import {
	analyzeImpact,
	formatImpactJson,
	formatImpactText,
} from "../utils/impactAnalysis.js"
import { logger } from "../utils/logger.js"

export const impactCommand = define({
	name: "impact",
	description: "Analyze which screens depend on a specific API/service",
	args: {
		api: {
			type: "positional",
			description:
				"API or service name to analyze (e.g., InvoiceAPI.getDetail)",
			required: true,
		},
		config: {
			type: "string",
			short: "c",
			description: "Path to config file",
		},
		format: {
			type: "string",
			short: "f",
			description: "Output format: text (default) or json",
			default: "text",
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

		const apiName = ctx.values.api
		if (!apiName) {
			logger.errorWithHelp(ERRORS.API_NAME_REQUIRED)
			process.exit(1)
		}

		const format = ctx.values.format ?? "text"
		const depth = ctx.values.depth ?? 3

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

		if (screens.length === 0) {
			logger.warn("No screens found in the catalog.")
			logger.blank()
			logger.log("Run 'screenbook generate' to create screen.meta.ts files,")
			logger.log("then 'screenbook build' to generate the catalog.")
			return
		}

		// Analyze impact
		const result = analyzeImpact(screens, apiName, depth)

		// Output result
		if (format === "json") {
			logger.log(formatImpactJson(result))
		} else {
			logger.log(formatImpactText(result))
		}
	},
})
