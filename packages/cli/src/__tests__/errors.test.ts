import { describe, expect, it } from "vitest"
import { ERRORS } from "../utils/errors.js"

describe("ERRORS", () => {
	describe("static error definitions", () => {
		it("should have ROUTES_PATTERN_MISSING error", () => {
			expect(ERRORS.ROUTES_PATTERN_MISSING).toMatchObject({
				title: "Routes configuration not found",
				suggestion: expect.any(String),
				example: expect.any(String),
			})
		})

		it("should have ROUTES_FILE_NOT_FOUND error", () => {
			const error = ERRORS.ROUTES_FILE_NOT_FOUND("src/router/routes.ts")
			expect(error).toMatchObject({
				title: "Routes file not found: src/router/routes.ts",
				suggestion: expect.any(String),
				example: expect.any(String),
			})
		})

		it("should have ROUTES_FILE_PARSE_ERROR error", () => {
			const error = ERRORS.ROUTES_FILE_PARSE_ERROR(
				"src/router/routes.ts",
				"Unexpected token",
			)
			expect(error).toMatchObject({
				title: "Failed to parse routes file: src/router/routes.ts",
				message: "Unexpected token",
				suggestion: expect.any(String),
			})
		})

		it("should have CONFIG_NOT_FOUND error", () => {
			expect(ERRORS.CONFIG_NOT_FOUND).toMatchObject({
				title: "Configuration file not found",
				suggestion: expect.any(String),
				example: expect.any(String),
			})
		})

		it("should have SCREENS_NOT_FOUND error", () => {
			expect(ERRORS.SCREENS_NOT_FOUND).toMatchObject({
				title: "screens.json not found",
				suggestion: expect.any(String),
				message: expect.any(String),
			})
		})

		it("should have SCREENS_PARSE_ERROR error", () => {
			expect(ERRORS.SCREENS_PARSE_ERROR).toMatchObject({
				title: "Failed to parse screens.json",
				suggestion: expect.any(String),
			})
		})

		it("should have API_NAME_REQUIRED error", () => {
			expect(ERRORS.API_NAME_REQUIRED).toMatchObject({
				title: "API name is required",
				suggestion: expect.any(String),
				example: expect.any(String),
			})
		})

		it("should have GIT_NOT_REPOSITORY error", () => {
			expect(ERRORS.GIT_NOT_REPOSITORY).toMatchObject({
				title: "Not a git repository",
				suggestion: expect.any(String),
			})
		})
	})

	describe("dynamic error functions", () => {
		it("should generate NO_ROUTES_FOUND with pattern", () => {
			const error = ERRORS.NO_ROUTES_FOUND("src/pages/**/*.tsx")
			expect(error).toMatchObject({
				title: "No routes found matching pattern: src/pages/**/*.tsx",
				suggestion: expect.any(String),
				example: expect.any(String),
			})
		})

		it("should generate FILE_READ_ERROR with file path and error", () => {
			const error = ERRORS.FILE_READ_ERROR(
				"src/config.ts",
				"ENOENT: no such file",
			)
			expect(error).toMatchObject({
				title: "Failed to read file: src/config.ts",
				message: "ENOENT: no such file",
				suggestion: expect.any(String),
			})
		})

		it("should generate PARSE_ERROR with file path and error", () => {
			const error = ERRORS.PARSE_ERROR("src/routes.ts", "Unexpected token")
			expect(error).toMatchObject({
				title: "Failed to parse: src/routes.ts",
				message: "Unexpected token",
				suggestion: expect.any(String),
			})
		})

		it("should generate SCREEN_NOT_FOUND without suggestions", () => {
			const error = ERRORS.SCREEN_NOT_FOUND("billing.unknown")
			expect(error).toMatchObject({
				title: 'Screen "billing.unknown" not found',
				message: undefined,
				suggestion: expect.any(String),
			})
		})

		it("should generate SCREEN_NOT_FOUND with suggestions", () => {
			const error = ERRORS.SCREEN_NOT_FOUND("billing.invoce", [
				"billing.invoice",
				"billing.invoices",
			])
			expect(error.title).toBe('Screen "billing.invoce" not found')
			expect(error.message).toContain("Did you mean one of these?")
			expect(error.message).toContain("billing.invoice")
			expect(error.message).toContain("billing.invoices")
			expect(error.suggestion).toBeDefined()
		})

		it("should generate META_FILE_LOAD_ERROR with file path", () => {
			const error = ERRORS.META_FILE_LOAD_ERROR("src/screens/home.meta.ts")
			expect(error).toMatchObject({
				title: "Failed to load src/screens/home.meta.ts",
				suggestion: expect.any(String),
				example: expect.any(String),
			})
		})

		it("should generate GIT_CHANGED_FILES_ERROR with base branch", () => {
			const error = ERRORS.GIT_CHANGED_FILES_ERROR("main")
			expect(error).toMatchObject({
				title: "Failed to get changed files from git",
				message: expect.stringContaining("main"),
				suggestion: expect.stringContaining("main"),
			})
		})

		it("should generate SERVER_START_FAILED with error message", () => {
			const error = ERRORS.SERVER_START_FAILED("EADDRINUSE: port 4321 in use")
			expect(error).toMatchObject({
				title: "Failed to start development server",
				message: "EADDRINUSE: port 4321 in use",
				suggestion: expect.any(String),
			})
		})

		it("should generate VALIDATION_FAILED with singular error count", () => {
			const error = ERRORS.VALIDATION_FAILED(1)
			expect(error.title).toBe("Validation failed with 1 error")
		})

		it("should generate VALIDATION_FAILED with plural error count", () => {
			const error = ERRORS.VALIDATION_FAILED(5)
			expect(error.title).toBe("Validation failed with 5 errors")
		})

		it("should generate LINT_MISSING_META with singular counts", () => {
			const error = ERRORS.LINT_MISSING_META(1, 1)
			expect(error.title).toBe("1 route missing screen.meta.ts")
			expect(error.message).toContain("Found 1 route file")
			expect(error.message).toContain("1 is missing")
		})

		it("should generate LINT_MISSING_META with plural counts", () => {
			const error = ERRORS.LINT_MISSING_META(3, 10)
			expect(error.title).toBe("3 routes missing screen.meta.ts")
			expect(error.message).toContain("Found 10 route files")
			expect(error.message).toContain("3 are missing")
		})

		it("should generate CYCLES_DETECTED with singular count", () => {
			const error = ERRORS.CYCLES_DETECTED(1)
			expect(error.title).toBe("1 circular navigation detected")
			expect(error.suggestion).toBeDefined()
			expect(error.example).toBeDefined()
		})

		it("should generate CYCLES_DETECTED with plural count", () => {
			const error = ERRORS.CYCLES_DETECTED(3)
			expect(error.title).toBe("3 circular navigations detected")
		})
	})
})
