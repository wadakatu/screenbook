import type { ErrorOptions } from "./logger.js"

/**
 * Centralized error definitions for consistent error messages across CLI commands
 */
export const ERRORS = {
	// ============================================
	// Configuration Errors
	// ============================================

	ROUTES_PATTERN_MISSING: {
		title: "Routes configuration not found",
		suggestion:
			"Add routesPattern (for file-based routing) or routesFile (for config-based routing) to your screenbook.config.ts.",
		example: `import { defineConfig } from "@screenbook/core"

// Option 1: File-based routing (Next.js, Nuxt, etc.)
export default defineConfig({
  routesPattern: "src/pages/**/page.tsx",
})

// Option 2: Config-based routing (Vue Router, React Router, etc.)
export default defineConfig({
  routesFile: "src/router/routes.ts",
})`,
	} satisfies ErrorOptions,

	ROUTES_FILE_NOT_FOUND: (filePath: string): ErrorOptions => ({
		title: `Routes file not found: ${filePath}`,
		suggestion:
			"Check the routesFile path in your screenbook.config.ts. The file should export a routes array.",
		example: `import { defineConfig } from "@screenbook/core"

export default defineConfig({
  routesFile: "src/router/routes.ts",  // Make sure this file exists
})`,
	}),

	ROUTES_FILE_PARSE_ERROR: (filePath: string, error: string): ErrorOptions => ({
		title: `Failed to parse routes file: ${filePath}`,
		message: error,
		suggestion:
			"Ensure the file exports a valid routes array. Check for syntax errors or unsupported patterns.",
	}),

	CONFIG_NOT_FOUND: {
		title: "Configuration file not found",
		suggestion:
			"Run 'screenbook init' to create a screenbook.config.ts file, or create one manually.",
		example: `import { defineConfig } from "@screenbook/core"

export default defineConfig({
  metaPattern: "src/**/screen.meta.ts",
})`,
	} satisfies ErrorOptions,

	// ============================================
	// Build/File Errors
	// ============================================

	SCREENS_NOT_FOUND: {
		title: "screens.json not found",
		suggestion: "Run 'screenbook build' first to generate the screen catalog.",
		message:
			"If you haven't set up Screenbook yet, run 'screenbook init' to get started.",
	} satisfies ErrorOptions,

	SCREENS_PARSE_ERROR: {
		title: "Failed to parse screens.json",
		suggestion:
			"The screens.json file may be corrupted. Try running 'screenbook build' to regenerate it.",
	} satisfies ErrorOptions,

	META_FILE_LOAD_ERROR: (filePath: string): ErrorOptions => ({
		title: `Failed to load ${filePath}`,
		suggestion:
			"Check the file for syntax errors or missing exports. The file should export a 'screen' object.",
		example: `import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
  id: "example.screen",
  title: "Example Screen",
  route: "/example",
})`,
	}),

	// ============================================
	// Command Argument Errors
	// ============================================

	API_NAME_REQUIRED: {
		title: "API name is required",
		suggestion: "Provide the API name as an argument.",
		example: `screenbook impact UserAPI.getProfile
screenbook impact "PaymentAPI.*"  # Use quotes for patterns`,
	} satisfies ErrorOptions,

	// ============================================
	// Git Errors
	// ============================================

	GIT_CHANGED_FILES_ERROR: (baseBranch: string): ErrorOptions => ({
		title: "Failed to get changed files from git",
		message: `Make sure you are in a git repository and the base branch '${baseBranch}' exists.`,
		suggestion: `Verify the base branch exists with: git branch -a | grep ${baseBranch}`,
	}),

	GIT_NOT_REPOSITORY: {
		title: "Not a git repository",
		suggestion:
			"This command requires a git repository. Initialize one with 'git init' or navigate to an existing repository.",
	} satisfies ErrorOptions,

	// ============================================
	// Server Errors
	// ============================================

	SERVER_START_FAILED: (error: string): ErrorOptions => ({
		title: "Failed to start development server",
		message: error,
		suggestion:
			"Check if the port is already in use or if there are any dependency issues.",
	}),

	// ============================================
	// Validation Errors
	// ============================================

	VALIDATION_FAILED: (errorCount: number): ErrorOptions => ({
		title: `Validation failed with ${errorCount} error${errorCount === 1 ? "" : "s"}`,
		suggestion:
			"Fix the validation errors above. Screen references must point to existing screens.",
	}),

	// ============================================
	// Lint Errors
	// ============================================

	LINT_MISSING_META: (
		missingCount: number,
		totalRoutes: number,
	): ErrorOptions => ({
		title: `${missingCount} route${missingCount === 1 ? "" : "s"} missing screen.meta.ts`,
		message: `Found ${totalRoutes} route file${totalRoutes === 1 ? "" : "s"}, but ${missingCount} ${missingCount === 1 ? "is" : "are"} missing colocated screen.meta.ts.`,
		suggestion:
			"Add screen.meta.ts files next to your route files, or run 'screenbook generate' to create them.",
	}),

	// ============================================
	// Cycle Detection Errors
	// ============================================

	CYCLES_DETECTED: (cycleCount: number): ErrorOptions => ({
		title: `${cycleCount} circular navigation${cycleCount === 1 ? "" : "s"} detected`,
		suggestion:
			"Review the navigation flow. Use 'allowCycles: true' in screen.meta.ts to allow intentional cycles, or use --allow-cycles to suppress all warnings.",
		example: `// Allow a specific screen to be part of cycles
export const screen = defineScreen({
  id: "billing.invoice.detail",
  next: ["billing.invoices"],
  allowCycles: true,  // This cycle is intentional
})`,
	}),
}
