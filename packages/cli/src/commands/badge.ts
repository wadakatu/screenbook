import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { define } from "gunshi"
import { glob } from "tinyglobby"
import { loadConfig } from "../utils/config.js"
import { ERRORS } from "../utils/errors.js"
import { logger, setVerbose } from "../utils/logger.js"

const VALID_FORMATS = ["svg", "json", "shields-json"] as const
const VALID_STYLES = ["flat", "flat-square"] as const

type BadgeFormat = (typeof VALID_FORMATS)[number]
type BadgeStyle = (typeof VALID_STYLES)[number]

interface CoverageResult {
	total: number
	covered: number
	percentage: number
}

/**
 * Calculate coverage based on route files and meta files
 */
async function calculateCoverage(
	routesPattern: string,
	metaPattern: string,
	ignore: string[],
	cwd: string,
): Promise<CoverageResult> {
	// Find all route files
	const routeFiles = await glob(routesPattern, { cwd, ignore })

	if (routeFiles.length === 0) {
		return { total: 0, covered: 0, percentage: 0 }
	}

	// Find all screen.meta.ts files
	const metaFiles = await glob(metaPattern, { cwd, ignore })

	// Build a set of directories that have screen.meta.ts
	const metaDirs = new Set<string>()
	for (const metaFile of metaFiles) {
		metaDirs.add(dirname(metaFile))
	}

	// Count covered routes
	let covered = 0
	for (const routeFile of routeFiles) {
		if (metaDirs.has(dirname(routeFile))) {
			covered++
		}
	}

	const total = routeFiles.length
	const percentage = Math.round((covered / total) * 100)

	return { total, covered, percentage }
}

/**
 * Get badge color based on coverage percentage
 */
function getBadgeColor(percentage: number): string {
	if (percentage >= 80) return "#4c1" // Green
	if (percentage >= 50) return "#dfb317" // Yellow
	return "#e05d44" // Red
}

/**
 * Get shields.io color name based on coverage percentage
 */
function getShieldsColorName(percentage: number): string {
	if (percentage >= 80) return "brightgreen"
	if (percentage >= 50) return "yellow"
	return "red"
}

/**
 * Generate SVG badge
 */
export function generateSvgBadge(
	percentage: number,
	style: BadgeStyle = "flat",
): string {
	const color = getBadgeColor(percentage)
	const label = "screenbook"
	const value = `${percentage}%`

	const labelWidth = 70
	const valueWidth = 45
	const totalWidth = labelWidth + valueWidth
	const radius = style === "flat" ? 3 : 0

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="a">
    <rect width="${totalWidth}" height="20" rx="${radius}" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#a)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#b)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`
}

/**
 * Generate shields.io endpoint JSON
 */
export function generateShieldsJson(percentage: number): object {
	return {
		schemaVersion: 1,
		label: "screenbook",
		message: `${percentage}%`,
		color: getShieldsColorName(percentage),
	}
}

/**
 * Generate simple JSON with coverage data
 */
export function generateSimpleJson(coverage: CoverageResult): object {
	return {
		percentage: coverage.percentage,
		covered: coverage.covered,
		total: coverage.total,
	}
}

export const badgeCommand = define({
	name: "badge",
	description: "Generate coverage badge for README",
	args: {
		config: {
			type: "string",
			short: "c",
			description: "Path to config file",
		},
		output: {
			type: "string",
			short: "o",
			description: "Output file path",
		},
		format: {
			type: "string",
			short: "f",
			description: "Output format: svg (default), json, shields-json",
			default: "svg",
		},
		style: {
			type: "string",
			description: "Badge style: flat (default), flat-square",
			default: "flat",
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
		const cwd = process.cwd()

		// Validate format and style arguments
		const formatInput = ctx.values.format ?? "svg"
		const styleInput = ctx.values.style ?? "flat"

		if (!VALID_FORMATS.includes(formatInput as BadgeFormat)) {
			logger.error(`Invalid format: "${formatInput}"`)
			logger.log(
				`  ${logger.dim(`Valid formats: ${VALID_FORMATS.join(", ")}`)}`,
			)
			process.exit(1)
		}

		if (!VALID_STYLES.includes(styleInput as BadgeStyle)) {
			logger.error(`Invalid style: "${styleInput}"`)
			logger.log(`  ${logger.dim(`Valid styles: ${VALID_STYLES.join(", ")}`)}`)
			process.exit(1)
		}

		const format = formatInput as BadgeFormat
		const style = styleInput as BadgeStyle

		// Load configuration
		let config: Awaited<ReturnType<typeof loadConfig>>
		try {
			config = await loadConfig(ctx.values.config)
		} catch (error) {
			if (ctx.values.config) {
				logger.errorWithStack(
					error,
					`Failed to load config from ${ctx.values.config}`,
				)
			} else {
				logger.errorWithHelp(ERRORS.CONFIG_NOT_FOUND)
			}
			process.exit(1)
		}

		// Check for routes configuration
		if (!config.routesPattern) {
			logger.errorWithHelp(ERRORS.ROUTES_PATTERN_MISSING)
			process.exit(1)
		}

		logger.info("Calculating coverage...")

		// Calculate coverage
		let coverage: CoverageResult
		try {
			coverage = await calculateCoverage(
				config.routesPattern,
				config.metaPattern,
				config.ignore,
				cwd,
			)
		} catch (error) {
			logger.errorWithStack(error, "Failed to calculate coverage")
			logger.log(
				`  ${logger.dim("Check that your routesPattern and metaPattern are valid glob patterns.")}`,
			)
			process.exit(1)
		}

		if (coverage.total === 0) {
			logger.warn(`No route files found matching: ${config.routesPattern}`)
			logger.log(
				`  ${logger.dim("Badge will show 0% coverage for empty projects.")}`,
			)
		}

		logger.log(
			`Coverage: ${coverage.covered}/${coverage.total} (${coverage.percentage}%)`,
		)

		// Generate badge content
		let content: string
		let extension: string

		switch (format) {
			case "shields-json":
				content = JSON.stringify(
					generateShieldsJson(coverage.percentage),
					null,
					2,
				)
				extension = "json"
				break
			case "json":
				content = JSON.stringify(generateSimpleJson(coverage), null, 2)
				extension = "json"
				break
			default:
				content = generateSvgBadge(coverage.percentage, style)
				extension = "svg"
				break
		}

		// Determine output path
		const defaultFileName =
			format === "shields-json"
				? "coverage.json"
				: `coverage-badge.${extension}`
		const outputPath =
			ctx.values.output ?? join(cwd, config.outDir, defaultFileName)

		// Ensure output directory exists
		const outputDir = dirname(outputPath)
		try {
			if (!existsSync(outputDir)) {
				mkdirSync(outputDir, { recursive: true })
			}
		} catch (error) {
			logger.errorWithStack(
				error,
				`Failed to create output directory: ${outputDir}`,
			)
			logger.log(
				`  ${logger.dim("Check that you have write permissions to this location.")}`,
			)
			process.exit(1)
		}

		// Write the badge
		try {
			writeFileSync(outputPath, content)
		} catch (error) {
			logger.errorWithStack(error, `Failed to write badge file: ${outputPath}`)
			logger.log(
				`  ${logger.dim("Check that you have write permissions and sufficient disk space.")}`,
			)
			process.exit(1)
		}

		logger.blank()
		logger.success(`Generated ${logger.path(outputPath)}`)

		// Show usage hint
		if (format === "svg") {
			logger.blank()
			logger.log(logger.dim("Usage in README.md:"))
			logger.log(
				logger.dim(`  ![Screenbook Coverage](${outputPath.replace(cwd, ".")})`),
			)
		} else if (format === "shields-json") {
			logger.blank()
			logger.log(logger.dim("Usage with shields.io:"))
			logger.log(
				logger.dim(
					"  ![Coverage](https://img.shields.io/endpoint?url=YOUR_URL/coverage.json)",
				),
			)
		}
	},
})
