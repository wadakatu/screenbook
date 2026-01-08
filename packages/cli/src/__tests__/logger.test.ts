import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { logger, setVerbose, type WarnOptions } from "../utils/logger.js"

describe("logger", () => {
	let consoleLogSpy: ReturnType<typeof vi.spyOn>
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {})
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
	})

	afterEach(() => {
		consoleLogSpy.mockRestore()
		consoleErrorSpy.mockRestore()
		setVerbose(false)
	})

	describe("warnWithHelp", () => {
		it("should output warning with title only", () => {
			logger.warnWithHelp({ title: "Test warning" })

			const output = consoleLogSpy.mock.calls
				.map((call: unknown[]) => call[0])
				.join("\n")
			expect(output).toContain("Warning: Test warning")
		})

		it("should output warning with title and message", () => {
			logger.warnWithHelp({
				title: "Spread operator detected",
				message: "Cannot statically analyze",
			})

			const calls = consoleLogSpy.mock.calls
			const output = calls.map((call: unknown[]) => call[0]).join("\n")

			expect(output).toContain("Warning: Spread operator detected")
			expect(output).toContain("Cannot statically analyze")
		})

		it("should output warning with details as bullet points", () => {
			logger.warnWithHelp({
				title: "Test warning",
				details: ["Detail one", "Detail two"],
			})

			const calls = consoleLogSpy.mock.calls
			const output = calls.map((call: unknown[]) => call[0]).join("\n")

			expect(output).toContain("This means:")
			expect(output).toContain("Detail one")
			expect(output).toContain("Detail two")
		})

		it("should output warning with suggestions as numbered list", () => {
			logger.warnWithHelp({
				title: "Test warning",
				suggestions: ["Fix suggestion one", "Fix suggestion two", "Fix three"],
			})

			const calls = consoleLogSpy.mock.calls
			const output = calls.map((call: unknown[]) => call[0]).join("\n")

			expect(output).toContain("To fix this, either:")
			expect(output).toContain("1. Fix suggestion one")
			expect(output).toContain("2. Fix suggestion two")
			expect(output).toContain("3. Fix three")
		})

		it("should output complete warning with all fields", () => {
			const options: WarnOptions = {
				title: "Spread operator detected at line 20",
				message: "Routes from spread operators cannot be statically analyzed.",
				details: [
					"screenbook won't auto-generate screen.meta.ts",
					"Manual creation needed",
				],
				suggestions: [
					"Inline the routes directly",
					"Manually create screen.meta.ts",
					"Ignore this warning",
				],
			}

			logger.warnWithHelp(options)

			const calls = consoleLogSpy.mock.calls
			const output = calls.map((call: unknown[]) => call[0]).join("\n")

			expect(output).toContain("Warning: Spread operator detected at line 20")
			expect(output).toContain(
				"Routes from spread operators cannot be statically analyzed.",
			)
			expect(output).toContain("This means:")
			expect(output).toContain("screenbook won't auto-generate screen.meta.ts")
			expect(output).toContain("Manual creation needed")
			expect(output).toContain("To fix this, either:")
			expect(output).toContain("1. Inline the routes directly")
			expect(output).toContain("2. Manually create screen.meta.ts")
			expect(output).toContain("3. Ignore this warning")
		})

		it("should handle empty details array gracefully", () => {
			logger.warnWithHelp({
				title: "Test warning",
				details: [],
			})

			const calls = consoleLogSpy.mock.calls
			const output = calls.map((call: unknown[]) => call[0]).join("\n")

			expect(output).toContain("Warning: Test warning")
			expect(output).not.toContain("This means:")
		})

		it("should handle empty suggestions array gracefully", () => {
			logger.warnWithHelp({
				title: "Test warning",
				suggestions: [],
			})

			const calls = consoleLogSpy.mock.calls
			const output = calls.map((call: unknown[]) => call[0]).join("\n")

			expect(output).toContain("Warning: Test warning")
			expect(output).not.toContain("To fix this, either:")
		})

		it("should handle undefined details and suggestions", () => {
			logger.warnWithHelp({
				title: "Simple warning",
			})

			const calls = consoleLogSpy.mock.calls
			const output = calls.map((call: unknown[]) => call[0]).join("\n")

			expect(output).toContain("Warning: Simple warning")
			expect(output).not.toContain("This means:")
			expect(output).not.toContain("To fix this, either:")
		})
	})

	describe("errorWithHelp", () => {
		it("should output error with title only", () => {
			logger.errorWithHelp({ title: "Test error" })

			const calls = consoleErrorSpy.mock.calls
			const output = calls.map((call: unknown[]) => call[0]).join("\n")

			expect(output).toContain("Error: Test error")
		})

		it("should output error with message", () => {
			logger.errorWithHelp({
				title: "Config not found",
				message: "No screenbook.config.ts found",
			})

			const calls = consoleErrorSpy.mock.calls
			const output = calls.map((call: unknown[]) => call[0]).join("\n")

			expect(output).toContain("Error: Config not found")
			expect(output).toContain("No screenbook.config.ts found")
		})

		it("should output error with suggestion", () => {
			logger.errorWithHelp({
				title: "Test error",
				suggestion: "Run screenbook init first",
			})

			const calls = consoleErrorSpy.mock.calls
			const output = calls.map((call: unknown[]) => call[0]).join("\n")

			expect(output).toContain("Suggestion:")
			expect(output).toContain("Run screenbook init first")
		})

		it("should output error with example", () => {
			logger.errorWithHelp({
				title: "Test error",
				example: "screenbook init\nscreenbook build",
			})

			const calls = consoleErrorSpy.mock.calls
			const output = calls.map((call: unknown[]) => call[0]).join("\n")

			expect(output).toContain("Example:")
			expect(output).toContain("screenbook init")
			expect(output).toContain("screenbook build")
		})
	})

	describe("errorWithStack", () => {
		it("should output error message without stack in non-verbose mode", () => {
			setVerbose(false)
			const error = new Error("Test error")

			logger.errorWithStack(error)

			const calls = consoleErrorSpy.mock.calls
			const output = calls.map((call: unknown[]) => call[0]).join("\n")

			expect(output).toContain("Error: Test error")
			expect(output).not.toContain("Stack trace:")
		})

		it("should output error message with stack in verbose mode", () => {
			setVerbose(true)
			const error = new Error("Test error")

			logger.errorWithStack(error)

			const calls = consoleErrorSpy.mock.calls
			const output = calls.map((call: unknown[]) => call[0]).join("\n")

			expect(output).toContain("Error: Test error")
			expect(output).toContain("Stack trace:")
		})

		it("should include context in error message", () => {
			const error = new Error("File not found")

			logger.errorWithStack(error, "Failed to load config")

			const calls = consoleErrorSpy.mock.calls
			const output = calls.map((call: unknown[]) => call[0]).join("\n")

			expect(output).toContain("Error: Failed to load config: File not found")
		})

		it("should handle non-Error objects", () => {
			logger.errorWithStack("String error")

			const calls = consoleErrorSpy.mock.calls
			const output = calls.map((call: unknown[]) => call[0]).join("\n")

			expect(output).toContain("Error: String error")
		})
	})

	describe("basic logging methods", () => {
		it("success should log with green checkmark", () => {
			logger.success("Operation completed")

			expect(consoleLogSpy).toHaveBeenCalled()
			const output = consoleLogSpy.mock.calls[0][0]
			expect(output).toContain("Operation completed")
		})

		it("error should log with red X", () => {
			logger.error("Something failed")

			expect(consoleErrorSpy).toHaveBeenCalled()
			const output = consoleErrorSpy.mock.calls[0][0]
			expect(output).toContain("Error: Something failed")
		})

		it("warn should log with yellow warning", () => {
			logger.warn("Be careful")

			expect(consoleLogSpy).toHaveBeenCalled()
			const output = consoleLogSpy.mock.calls[0][0]
			expect(output).toContain("Warning: Be careful")
		})

		it("info should log with cyan info icon", () => {
			logger.info("Informational message")

			expect(consoleLogSpy).toHaveBeenCalled()
			const output = consoleLogSpy.mock.calls[0][0]
			expect(output).toContain("Informational message")
		})

		it("step should log with dimmed arrow", () => {
			logger.step("Processing files...")

			expect(consoleLogSpy).toHaveBeenCalled()
			const output = consoleLogSpy.mock.calls[0][0]
			expect(output).toContain("Processing files...")
		})

		it("done should log with green text", () => {
			logger.done("All done!")

			expect(consoleLogSpy).toHaveBeenCalled()
			const output = consoleLogSpy.mock.calls[0][0]
			expect(output).toContain("All done!")
		})

		it("blank should log empty line", () => {
			logger.blank()

			expect(consoleLogSpy).toHaveBeenCalled()
		})
	})

	describe("formatting helpers", () => {
		it("bold should return bold text", () => {
			const result = logger.bold("Bold text")
			expect(result).toBeDefined()
			expect(typeof result).toBe("string")
		})

		it("dim should return dimmed text", () => {
			const result = logger.dim("Dim text")
			expect(result).toBeDefined()
			expect(typeof result).toBe("string")
		})

		it("code should return cyan text", () => {
			const result = logger.code("npm install")
			expect(result).toBeDefined()
			expect(typeof result).toBe("string")
		})

		it("path should return underlined text", () => {
			const result = logger.path("/path/to/file")
			expect(result).toBeDefined()
			expect(typeof result).toBe("string")
		})

		it("highlight should return cyan bold text", () => {
			const result = logger.highlight("Important!")
			expect(result).toBeDefined()
			expect(typeof result).toBe("string")
		})
	})
})
