import { logger } from "./logger.js"
import type { ParseWarning } from "./routeParserUtils.js"

/**
 * Options for displayWarnings function
 */
export interface DisplayWarningsOptions {
	/** Config setting for spread operator warnings */
	spreadOperatorSetting?: "warn" | "off" | "error"
}

/**
 * Result of displaying warnings
 */
export interface DisplayWarningsResult {
	/** Whether any warnings were displayed */
	hasWarnings: boolean
	/** Number of spread operator warnings */
	spreadCount: number
	/** Number of general warnings */
	generalCount: number
	/** Whether lint should fail due to spread operator errors */
	shouldFailLint: boolean
}

/**
 * Display structured warnings with appropriate formatting
 * @param warnings - Array of parsed warnings
 * @param options - Display options
 * @returns Result containing warning counts and whether any were displayed
 */
export function displayWarnings(
	warnings: ParseWarning[],
	options: DisplayWarningsOptions = {},
): DisplayWarningsResult {
	const { spreadOperatorSetting = "warn" } = options
	let spreadCount = 0
	let generalCount = 0

	for (const warning of warnings) {
		if (warning.type === "spread") {
			// Skip if spread warnings are disabled
			if (spreadOperatorSetting === "off") {
				continue
			}

			spreadCount++

			const varPart = warning.variableName
				? `'${warning.variableName}'`
				: "spread variable"

			// Use error prefix if configured as error
			if (spreadOperatorSetting === "error") {
				logger.error(warning.message)
				logger.blank()
				logger.log(
					"  Routes from spread operators cannot be statically analyzed by screenbook.",
				)
				logger.log("  This means:")
				logger.log(
					`  ${logger.dim("•")} screenbook won't detect missing screen.meta.ts for routes in ${varPart}`,
				)
				logger.log(
					`  ${logger.dim("•")} These routes may appear to pass lint even without screen.meta.ts files`,
				)
				logger.blank()
			} else {
				logger.warnWithHelp({
					title: warning.message,
					message:
						"Routes from spread operators cannot be statically analyzed by screenbook.",
					details: [
						`screenbook won't detect missing screen.meta.ts for routes in ${varPart}`,
						"These routes may appear to pass lint even without screen.meta.ts files",
					],
					suggestions: [
						"Inline the routes directly in the main routes array",
						"Manually ensure screen.meta.ts files exist for the spread routes",
						"Ignore this warning if you're OK with manual coverage tracking",
					],
				})
			}
		} else {
			generalCount++
			logger.warn(warning.message)
		}
	}

	return {
		hasWarnings: spreadCount > 0 || generalCount > 0,
		spreadCount,
		generalCount,
		shouldFailLint: spreadOperatorSetting === "error" && spreadCount > 0,
	}
}

/**
 * Display warnings for generate command (slightly different messaging)
 * @param warnings - Array of parsed warnings
 * @param options - Display options
 * @returns Result containing warning counts and whether any were displayed
 */
export function displayGenerateWarnings(
	warnings: ParseWarning[],
	options: DisplayWarningsOptions = {},
): DisplayWarningsResult {
	const { spreadOperatorSetting = "warn" } = options
	let spreadCount = 0
	let generalCount = 0
	let suppressedCount = 0

	for (const warning of warnings) {
		if (warning.type === "spread") {
			// Skip if spread warnings are disabled
			if (spreadOperatorSetting === "off") {
				suppressedCount++
				continue
			}

			spreadCount++

			const varPart = warning.variableName
				? `'${warning.variableName}'`
				: "spread variable"

			// Use error prefix if configured as error
			if (spreadOperatorSetting === "error") {
				logger.error(warning.message)
				logger.blank()
				logger.log(
					"  Routes from spread operators cannot be statically analyzed by screenbook.",
				)
				logger.log("  This means:")
				logger.log(
					`  ${logger.dim("•")} screenbook won't auto-generate screen.meta.ts for routes in ${varPart}`,
				)
				logger.log(
					`  ${logger.dim("•")} You'll need to manually create screen.meta.ts files for these routes`,
				)
				logger.blank()
			} else {
				logger.warnWithHelp({
					title: warning.message,
					message:
						"Routes from spread operators cannot be statically analyzed by screenbook.",
					details: [
						`screenbook won't auto-generate screen.meta.ts for routes in ${varPart}`,
						"You'll need to manually create screen.meta.ts files for these routes",
					],
					suggestions: [
						"Inline the routes directly in the main routes array",
						"Manually create screen.meta.ts files for the spread routes",
						"Ignore this warning if you're OK with manual screen metadata",
					],
				})
			}
		} else {
			generalCount++
			logger.warn(warning.message)
		}
	}

	// Log summary when warnings were suppressed
	if (suppressedCount > 0) {
		logger.log(
			logger.dim(
				`  (${suppressedCount} spread operator warning(s) suppressed by configuration)`,
			),
		)
	}

	return {
		hasWarnings: spreadCount > 0 || generalCount > 0,
		spreadCount,
		generalCount,
		shouldFailLint: spreadOperatorSetting === "error" && spreadCount > 0,
	}
}
