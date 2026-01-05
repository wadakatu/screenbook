import pc from "picocolors"

// ============================================
// Verbose Mode State
// ============================================

let verboseMode = false

/**
 * Enable or disable verbose mode for detailed output
 */
export function setVerbose(verbose: boolean): void {
	verboseMode = verbose
}

/**
 * Check if verbose mode is enabled
 */
export function isVerbose(): boolean {
	return verboseMode
}

/**
 * Structured error options for detailed error messages
 */
export interface ErrorOptions {
	/** Error title (shown after "Error:") */
	title: string
	/** Additional error message/details */
	message?: string
	/** Actionable suggestion for the user */
	suggestion?: string
	/** Code example to help the user */
	example?: string
}

/**
 * Logger utility for consistent, color-coded CLI output
 */
export const logger = {
	// ============================================
	// Status Messages
	// ============================================

	/**
	 * Success message (green checkmark)
	 */
	success: (msg: string): void => {
		console.log(`${pc.green("✓")} ${msg}`)
	},

	/**
	 * Error message (red X)
	 */
	error: (msg: string): void => {
		console.error(`${pc.red("✗")} ${pc.red(`Error: ${msg}`)}`)
	},

	/**
	 * Warning message (yellow warning sign)
	 */
	warn: (msg: string): void => {
		console.log(`${pc.yellow("⚠")} ${pc.yellow(`Warning: ${msg}`)}`)
	},

	/**
	 * Info message (cyan info icon)
	 */
	info: (msg: string): void => {
		console.log(`${pc.cyan("ℹ")} ${msg}`)
	},

	// ============================================
	// Detailed Error with Guidance
	// ============================================

	/**
	 * Display a detailed error with actionable suggestions
	 */
	errorWithHelp: (options: ErrorOptions): void => {
		const { title, message, suggestion, example } = options

		console.error()
		console.error(`${pc.red("✗")} ${pc.red(`Error: ${title}`)}`)

		if (message) {
			console.error()
			console.error(`  ${message}`)
		}

		if (suggestion) {
			console.error()
			console.error(`  ${pc.cyan("Suggestion:")} ${suggestion}`)
		}

		if (example) {
			console.error()
			console.error(`  ${pc.dim("Example:")}`)
			for (const line of example.split("\n")) {
				console.error(`  ${pc.dim(line)}`)
			}
		}

		console.error()
	},

	/**
	 * Display an error with optional stack trace (shown only in verbose mode)
	 */
	errorWithStack: (error: unknown, context?: string): void => {
		const err = error instanceof Error ? error : new Error(String(error))
		const message = context ? `${context}: ${err.message}` : err.message
		console.error(`${pc.red("✗")} ${pc.red(`Error: ${message}`)}`)
		if (verboseMode && err.stack) {
			console.error()
			console.error(`  ${pc.dim("Stack trace:")}`)
			for (const line of err.stack.split("\n").slice(1)) {
				console.error(`  ${pc.dim(line)}`)
			}
		}
		console.error()
	},

	// ============================================
	// Progress Indicators
	// ============================================

	/**
	 * Step indicator (dimmed arrow)
	 */
	step: (msg: string): void => {
		console.log(`${pc.dim("→")} ${msg}`)
	},

	/**
	 * Done/completed indicator (green checkmark with green text)
	 */
	done: (msg: string): void => {
		console.log(`${pc.green("✓")} ${pc.green(msg)}`)
	},

	/**
	 * Item success (green checkmark, indented)
	 */
	itemSuccess: (msg: string): void => {
		console.log(`  ${pc.green("✓")} ${msg}`)
	},

	/**
	 * Item failure (red X, indented)
	 */
	itemError: (msg: string): void => {
		console.log(`  ${pc.red("✗")} ${msg}`)
	},

	/**
	 * Item warning (yellow warning, indented)
	 */
	itemWarn: (msg: string): void => {
		console.log(`  ${pc.yellow("⚠")} ${msg}`)
	},

	// ============================================
	// Plain Output
	// ============================================

	/**
	 * Plain log (no prefix)
	 */
	log: (msg: string): void => {
		console.log(msg)
	},

	/**
	 * Blank line
	 */
	blank: (): void => {
		console.log()
	},

	// ============================================
	// Formatting Helpers
	// ============================================

	/**
	 * Bold text
	 */
	bold: (msg: string): string => pc.bold(msg),

	/**
	 * Dimmed text
	 */
	dim: (msg: string): string => pc.dim(msg),

	/**
	 * Code/command text (cyan)
	 */
	code: (msg: string): string => pc.cyan(msg),

	/**
	 * File path text (underlined)
	 */
	path: (msg: string): string => pc.underline(msg),

	/**
	 * Highlight text (cyan bold)
	 */
	highlight: (msg: string): string => pc.cyan(pc.bold(msg)),

	/**
	 * Green text
	 */
	green: (msg: string): string => pc.green(msg),

	/**
	 * Red text
	 */
	red: (msg: string): string => pc.red(msg),

	/**
	 * Yellow text
	 */
	yellow: (msg: string): string => pc.yellow(msg),
}
