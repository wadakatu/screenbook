import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { Screen } from "@screenbook/core"
import { define } from "gunshi"
import { loadConfig } from "../utils/config.js"
import {
	analyzeImpact,
	formatImpactJson,
	formatImpactText,
} from "../utils/impactAnalysis.js"

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
			console.error("Error: API name is required")
			console.error("")
			console.error("Usage: screenbook impact <api-name>")
			console.error("")
			console.error("Examples:")
			console.error("  screenbook impact InvoiceAPI.getDetail")
			console.error("  screenbook impact PaymentService")
			process.exit(1)
		}

		const format = ctx.values.format ?? "text"
		const depth = ctx.values.depth ?? 3

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

		if (screens.length === 0) {
			console.log("No screens found in the catalog.")
			console.log("")
			console.log("Run 'screenbook generate' to create screen.meta.ts files,")
			console.log("then 'screenbook build' to generate the catalog.")
			return
		}

		// Analyze impact
		const result = analyzeImpact(screens, apiName, depth)

		// Output result
		if (format === "json") {
			console.log(formatImpactJson(result))
		} else {
			console.log(formatImpactText(result))
		}
	},
})
