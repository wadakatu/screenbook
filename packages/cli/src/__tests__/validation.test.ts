import type { Screen } from "@screenbook/core"
import { describe, expect, it } from "vitest"
import {
	formatValidationErrors,
	validateScreenReferences,
} from "../utils/validation.js"

describe("validateScreenReferences", () => {
	it("should return valid for screens with correct references", () => {
		const screens: Screen[] = [
			{
				id: "home",
				title: "Home",
				route: "/",
				next: ["dashboard"],
			},
			{
				id: "dashboard",
				title: "Dashboard",
				route: "/dashboard",
				entryPoints: ["home"],
			},
		]

		const result = validateScreenReferences(screens)
		expect(result.valid).toBe(true)
		expect(result.errors).toHaveLength(0)
	})

	it("should detect invalid next references", () => {
		const screens: Screen[] = [
			{
				id: "home",
				title: "Home",
				route: "/",
				next: ["nonexistent"],
			},
		]

		const result = validateScreenReferences(screens)
		expect(result.valid).toBe(false)
		expect(result.errors).toHaveLength(1)
		expect(result.errors[0]).toEqual({
			screenId: "home",
			field: "next",
			invalidRef: "nonexistent",
			suggestion: undefined,
		})
	})

	it("should detect invalid entryPoints references", () => {
		const screens: Screen[] = [
			{
				id: "dashboard",
				title: "Dashboard",
				route: "/dashboard",
				entryPoints: ["nonexistent"],
			},
		]

		const result = validateScreenReferences(screens)
		expect(result.valid).toBe(false)
		expect(result.errors).toHaveLength(1)
		expect(result.errors[0]).toEqual({
			screenId: "dashboard",
			field: "entryPoints",
			invalidRef: "nonexistent",
			suggestion: undefined,
		})
	})

	it("should suggest similar screen IDs for typos", () => {
		const screens: Screen[] = [
			{
				id: "billing.invoice.detail",
				title: "Invoice Detail",
				route: "/billing/invoices/:id",
				next: ["billing.invoice.editt"], // typo: extra 't'
			},
			{
				id: "billing.invoice.edit",
				title: "Invoice Edit",
				route: "/billing/invoices/:id/edit",
			},
		]

		const result = validateScreenReferences(screens)
		expect(result.valid).toBe(false)
		expect(result.errors).toHaveLength(1)
		expect(result.errors[0]?.suggestion).toBe("billing.invoice.edit")
	})

	it("should detect multiple errors across screens", () => {
		const screens: Screen[] = [
			{
				id: "screen1",
				title: "Screen 1",
				route: "/1",
				next: ["invalid1", "invalid2"],
			},
			{
				id: "screen2",
				title: "Screen 2",
				route: "/2",
				entryPoints: ["invalid3"],
			},
		]

		const result = validateScreenReferences(screens)
		expect(result.valid).toBe(false)
		expect(result.errors).toHaveLength(3)
	})

	it("should handle screens without next or entryPoints", () => {
		const screens: Screen[] = [
			{
				id: "standalone",
				title: "Standalone",
				route: "/standalone",
			},
		]

		const result = validateScreenReferences(screens)
		expect(result.valid).toBe(true)
		expect(result.errors).toHaveLength(0)
	})
})

describe("formatValidationErrors", () => {
	it("should format errors with suggestions", () => {
		const errors = [
			{
				screenId: "home",
				field: "next" as const,
				invalidRef: "dashbord",
				suggestion: "dashboard",
			},
		]

		const output = formatValidationErrors(errors)
		expect(output).toContain('Screen "home"')
		expect(output).toContain('next references non-existent screen "dashbord"')
		expect(output).toContain('Did you mean "dashboard"?')
	})

	it("should format errors without suggestions", () => {
		const errors = [
			{
				screenId: "home",
				field: "next" as const,
				invalidRef: "completely-different",
				suggestion: undefined,
			},
		]

		const output = formatValidationErrors(errors)
		expect(output).toContain('Screen "home"')
		expect(output).not.toContain("Did you mean")
	})
})
