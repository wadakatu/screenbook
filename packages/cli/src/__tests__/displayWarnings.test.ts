import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	displayGenerateWarnings,
	displayWarnings,
} from "../utils/displayWarnings.js"
import { logger } from "../utils/logger.js"
import type { ParseWarning } from "../utils/routeParserUtils.js"

// Mock the logger
vi.mock("../utils/logger.js", () => ({
	logger: {
		warn: vi.fn(),
		warnWithHelp: vi.fn(),
		error: vi.fn(),
		log: vi.fn(),
		blank: vi.fn(),
		dim: vi.fn((text: string) => text),
	},
}))

describe("displayWarnings", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe("with spread warnings", () => {
		it("should display spread warnings by default", () => {
			const warnings: ParseWarning[] = [
				{
					type: "spread",
					message: "Spread operator detected at line 5",
					line: 5,
					variableName: "devRoutes",
				},
			]

			const result = displayWarnings(warnings)

			expect(result.hasWarnings).toBe(true)
			expect(result.spreadCount).toBe(1)
			expect(result.generalCount).toBe(0)
			expect(logger.warnWithHelp).toHaveBeenCalledTimes(1)
			expect(logger.warnWithHelp).toHaveBeenCalledWith(
				expect.objectContaining({
					title: "Spread operator detected at line 5",
					details: expect.arrayContaining([
						expect.stringContaining("'devRoutes'"),
					]),
				}),
			)
		})

		it("should display spread warnings with fallback when variableName is undefined", () => {
			const warnings: ParseWarning[] = [
				{
					type: "spread",
					message: "Spread operator detected at line 10",
					line: 10,
				},
			]

			const result = displayWarnings(warnings)

			expect(result.hasWarnings).toBe(true)
			expect(result.spreadCount).toBe(1)
			expect(logger.warnWithHelp).toHaveBeenCalledWith(
				expect.objectContaining({
					details: expect.arrayContaining([
						expect.stringContaining("spread variable"),
					]),
				}),
			)
		})

		it("should skip spread warnings when spreadOperatorSetting is 'off'", () => {
			const warnings: ParseWarning[] = [
				{
					type: "spread",
					message: "Spread operator detected at line 5",
					line: 5,
					variableName: "devRoutes",
				},
			]

			const result = displayWarnings(warnings, { spreadOperatorSetting: "off" })

			expect(result.hasWarnings).toBe(false)
			expect(result.spreadCount).toBe(0)
			expect(logger.warnWithHelp).not.toHaveBeenCalled()
		})

		it("should display spread warnings when spreadOperatorSetting is 'warn'", () => {
			const warnings: ParseWarning[] = [
				{
					type: "spread",
					message: "Spread operator detected",
					variableName: "routes",
				},
			]

			const result = displayWarnings(warnings, {
				spreadOperatorSetting: "warn",
			})

			expect(result.hasWarnings).toBe(true)
			expect(result.spreadCount).toBe(1)
			expect(result.shouldFailLint).toBe(false)
			expect(logger.warnWithHelp).toHaveBeenCalledTimes(1)
		})

		it("should display spread as error when spreadOperatorSetting is 'error'", () => {
			const warnings: ParseWarning[] = [
				{
					type: "spread",
					message: "Spread operator detected at line 5",
					line: 5,
					variableName: "devRoutes",
				},
			]

			const result = displayWarnings(warnings, {
				spreadOperatorSetting: "error",
			})

			expect(result.hasWarnings).toBe(true)
			expect(result.spreadCount).toBe(1)
			expect(result.shouldFailLint).toBe(true)
			expect(logger.error).toHaveBeenCalledWith(
				"Spread operator detected at line 5",
			)
			expect(logger.warnWithHelp).not.toHaveBeenCalled()
		})

		it("should set shouldFailLint=true only when error setting and spread present", () => {
			const warnings: ParseWarning[] = [
				{
					type: "general",
					message: "Some general warning",
				},
			]

			const result = displayWarnings(warnings, {
				spreadOperatorSetting: "error",
			})

			expect(result.hasWarnings).toBe(true)
			expect(result.generalCount).toBe(1)
			expect(result.spreadCount).toBe(0)
			expect(result.shouldFailLint).toBe(false)
		})
	})

	describe("with general warnings", () => {
		it("should display general warnings using simple warn()", () => {
			const warnings: ParseWarning[] = [
				{
					type: "general",
					message: "No routes found in file",
				},
			]

			const result = displayWarnings(warnings)

			expect(result.hasWarnings).toBe(true)
			expect(result.spreadCount).toBe(0)
			expect(result.generalCount).toBe(1)
			expect(logger.warn).toHaveBeenCalledTimes(1)
			expect(logger.warn).toHaveBeenCalledWith("No routes found in file")
			expect(logger.warnWithHelp).not.toHaveBeenCalled()
		})

		it("should always display general warnings regardless of spreadOperatorSetting", () => {
			const warnings: ParseWarning[] = [
				{
					type: "general",
					message: "Dynamic path segment detected",
				},
			]

			const result = displayWarnings(warnings, { spreadOperatorSetting: "off" })

			expect(result.hasWarnings).toBe(true)
			expect(result.generalCount).toBe(1)
			expect(logger.warn).toHaveBeenCalledWith("Dynamic path segment detected")
		})
	})

	describe("with mixed warnings", () => {
		it("should handle both spread and general warnings", () => {
			const warnings: ParseWarning[] = [
				{
					type: "spread",
					message: "Spread detected",
					variableName: "extraRoutes",
				},
				{
					type: "general",
					message: "General warning",
				},
			]

			const result = displayWarnings(warnings)

			expect(result.hasWarnings).toBe(true)
			expect(result.spreadCount).toBe(1)
			expect(result.generalCount).toBe(1)
			expect(logger.warnWithHelp).toHaveBeenCalledTimes(1)
			expect(logger.warn).toHaveBeenCalledTimes(1)
		})

		it("should skip only spread warnings when spreadOperatorSetting is 'off'", () => {
			const warnings: ParseWarning[] = [
				{
					type: "spread",
					message: "Spread detected",
					variableName: "extraRoutes",
				},
				{
					type: "general",
					message: "General warning",
				},
			]

			const result = displayWarnings(warnings, { spreadOperatorSetting: "off" })

			expect(result.hasWarnings).toBe(true)
			expect(result.spreadCount).toBe(0)
			expect(result.generalCount).toBe(1)
			expect(logger.warnWithHelp).not.toHaveBeenCalled()
			expect(logger.warn).toHaveBeenCalledTimes(1)
		})
	})

	describe("with empty warnings", () => {
		it("should handle empty warnings array", () => {
			const warnings: ParseWarning[] = []

			const result = displayWarnings(warnings)

			expect(result.hasWarnings).toBe(false)
			expect(result.spreadCount).toBe(0)
			expect(result.generalCount).toBe(0)
			expect(logger.warn).not.toHaveBeenCalled()
			expect(logger.warnWithHelp).not.toHaveBeenCalled()
		})
	})
})

describe("displayGenerateWarnings", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it("should display spread warnings with generate-specific messaging", () => {
		const warnings: ParseWarning[] = [
			{
				type: "spread",
				message: "Spread operator detected",
				variableName: "lazyRoutes",
			},
		]

		const result = displayGenerateWarnings(warnings)

		expect(result.hasWarnings).toBe(true)
		expect(result.spreadCount).toBe(1)
		expect(result.generalCount).toBe(0)
		expect(logger.warnWithHelp).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Spread operator detected",
				details: expect.arrayContaining([
					expect.stringContaining("won't auto-generate screen.meta.ts"),
					expect.stringContaining("'lazyRoutes'"),
				]),
			}),
		)
	})

	it("should display spread warnings with fallback when variableName is undefined", () => {
		const warnings: ParseWarning[] = [
			{
				type: "spread",
				message: "Spread operator detected at line 10",
				line: 10,
			},
		]

		const result = displayGenerateWarnings(warnings)

		expect(result.hasWarnings).toBe(true)
		expect(result.spreadCount).toBe(1)
		expect(logger.warnWithHelp).toHaveBeenCalledWith(
			expect.objectContaining({
				details: expect.arrayContaining([
					expect.stringContaining("spread variable"),
				]),
			}),
		)
	})

	it("should skip spread warnings and log suppression count when spreadOperatorSetting is 'off'", () => {
		const warnings: ParseWarning[] = [
			{
				type: "spread",
				message: "Spread detected",
				variableName: "devRoutes",
			},
			{
				type: "spread",
				message: "Spread detected 2",
				variableName: "prodRoutes",
			},
		]

		const result = displayGenerateWarnings(warnings, {
			spreadOperatorSetting: "off",
		})

		expect(result.hasWarnings).toBe(false)
		expect(result.spreadCount).toBe(0)
		expect(logger.warnWithHelp).not.toHaveBeenCalled()
		expect(logger.log).toHaveBeenCalledWith(
			expect.stringContaining("2 spread operator warning(s) suppressed"),
		)
	})

	it("should display spread as error when spreadOperatorSetting is 'error'", () => {
		const warnings: ParseWarning[] = [
			{
				type: "spread",
				message: "Spread operator detected at line 5",
				line: 5,
				variableName: "devRoutes",
			},
		]

		const result = displayGenerateWarnings(warnings, {
			spreadOperatorSetting: "error",
		})

		expect(result.hasWarnings).toBe(true)
		expect(result.spreadCount).toBe(1)
		expect(result.shouldFailLint).toBe(true)
		expect(logger.error).toHaveBeenCalledWith(
			"Spread operator detected at line 5",
		)
		expect(logger.warnWithHelp).not.toHaveBeenCalled()
	})

	it("should display general warnings normally", () => {
		const warnings: ParseWarning[] = [
			{
				type: "general",
				message: "Could not resolve component path",
			},
		]

		const result = displayGenerateWarnings(warnings)

		expect(result.hasWarnings).toBe(true)
		expect(result.spreadCount).toBe(0)
		expect(result.generalCount).toBe(1)
		expect(logger.warn).toHaveBeenCalledWith("Could not resolve component path")
	})

	it("should handle empty warnings array", () => {
		const warnings: ParseWarning[] = []

		const result = displayGenerateWarnings(warnings)

		expect(result.hasWarnings).toBe(false)
		expect(result.spreadCount).toBe(0)
		expect(result.generalCount).toBe(0)
		expect(logger.warn).not.toHaveBeenCalled()
		expect(logger.warnWithHelp).not.toHaveBeenCalled()
	})
})
