import type { Screen } from "@screenbook/core"
import { describe, expect, it } from "vitest"
import {
	analyzeImpact,
	formatImpactJson,
	formatImpactText,
} from "../utils/impactAnalysis.js"

const createScreen = (
	overrides: Partial<Screen> & { id: string; title: string; route: string },
): Screen => ({
	...overrides,
})

describe("analyzeImpact", () => {
	describe("direct dependencies", () => {
		it("should find direct dependents with exact match", () => {
			const screens: Screen[] = [
				createScreen({
					id: "billing.invoice.detail",
					title: "Invoice Detail",
					route: "/billing/invoices/:id",
					dependsOn: ["InvoiceAPI.getDetail"],
				}),
				createScreen({
					id: "billing.invoice.list",
					title: "Invoice List",
					route: "/billing/invoices",
					dependsOn: ["InvoiceAPI.list"],
				}),
			]

			const result = analyzeImpact(screens, "InvoiceAPI.getDetail")

			expect(result.direct).toHaveLength(1)
			expect(result.direct[0].id).toBe("billing.invoice.detail")
		})

		it("should find direct dependents with partial match (API prefix)", () => {
			const screens: Screen[] = [
				createScreen({
					id: "billing.invoice.detail",
					title: "Invoice Detail",
					route: "/billing/invoices/:id",
					dependsOn: ["InvoiceAPI.getDetail"],
				}),
				createScreen({
					id: "billing.invoice.edit",
					title: "Invoice Edit",
					route: "/billing/invoices/:id/edit",
					dependsOn: ["InvoiceAPI.update"],
				}),
				createScreen({
					id: "billing.payment",
					title: "Payment",
					route: "/billing/payment",
					dependsOn: ["PaymentAPI.process"],
				}),
			]

			const result = analyzeImpact(screens, "InvoiceAPI")

			expect(result.direct).toHaveLength(2)
			expect(result.direct.map((s) => s.id)).toContain("billing.invoice.detail")
			expect(result.direct.map((s) => s.id)).toContain("billing.invoice.edit")
		})

		it("should return empty when no dependents found", () => {
			const screens: Screen[] = [
				createScreen({
					id: "home",
					title: "Home",
					route: "/",
				}),
			]

			const result = analyzeImpact(screens, "SomeAPI")

			expect(result.direct).toHaveLength(0)
			expect(result.totalCount).toBe(0)
		})
	})

	describe("transitive dependencies", () => {
		it("should find screens that navigate to direct dependents", () => {
			const screens: Screen[] = [
				createScreen({
					id: "billing.invoice.detail",
					title: "Invoice Detail",
					route: "/billing/invoices/:id",
					dependsOn: ["InvoiceAPI.getDetail"],
					entryPoints: ["billing.invoice.list"],
				}),
				createScreen({
					id: "billing.invoice.list",
					title: "Invoice List",
					route: "/billing/invoices",
					next: ["billing.invoice.detail"],
				}),
				createScreen({
					id: "dashboard",
					title: "Dashboard",
					route: "/dashboard",
					next: ["billing.invoice.list"],
				}),
			]

			const result = analyzeImpact(screens, "InvoiceAPI.getDetail")

			expect(result.direct).toHaveLength(1)
			expect(result.transitive).toHaveLength(2)
			expect(result.transitive.map((t) => t.screen.id)).toContain(
				"billing.invoice.list",
			)
			expect(result.transitive.map((t) => t.screen.id)).toContain("dashboard")
		})

		it("should respect maxDepth parameter", () => {
			const screens: Screen[] = [
				createScreen({
					id: "target",
					title: "Target",
					route: "/target",
					dependsOn: ["TargetAPI"],
				}),
				createScreen({
					id: "level1",
					title: "Level 1",
					route: "/level1",
					next: ["target"],
				}),
				createScreen({
					id: "level2",
					title: "Level 2",
					route: "/level2",
					next: ["level1"],
				}),
				createScreen({
					id: "level3",
					title: "Level 3",
					route: "/level3",
					next: ["level2"],
				}),
			]

			const resultDepth1 = analyzeImpact(screens, "TargetAPI", 1)
			expect(resultDepth1.transitive).toHaveLength(1)
			expect(resultDepth1.transitive[0].screen.id).toBe("level1")

			const resultDepth3 = analyzeImpact(screens, "TargetAPI", 3)
			expect(resultDepth3.transitive).toHaveLength(3)
		})

		it("should handle circular navigation", () => {
			const screens: Screen[] = [
				createScreen({
					id: "screenA",
					title: "Screen A",
					route: "/a",
					dependsOn: ["TestAPI"],
					next: ["screenB"],
				}),
				createScreen({
					id: "screenB",
					title: "Screen B",
					route: "/b",
					next: ["screenA"], // Circular
				}),
			]

			// Should not hang or crash
			const result = analyzeImpact(screens, "TestAPI")

			expect(result.direct).toHaveLength(1)
			expect(result.direct[0].id).toBe("screenA")
		})
	})

	describe("total count", () => {
		it("should calculate correct total count", () => {
			const screens: Screen[] = [
				createScreen({
					id: "direct1",
					title: "Direct 1",
					route: "/direct1",
					dependsOn: ["API"],
				}),
				createScreen({
					id: "direct2",
					title: "Direct 2",
					route: "/direct2",
					dependsOn: ["API"],
				}),
				createScreen({
					id: "transitive",
					title: "Transitive",
					route: "/transitive",
					next: ["direct1"],
				}),
			]

			const result = analyzeImpact(screens, "API")

			expect(result.direct.length).toBe(2)
			expect(result.transitive.length).toBe(1)
			expect(result.totalCount).toBe(3)
		})
	})
})

describe("formatImpactText", () => {
	it("should format output with direct dependents", () => {
		const screens: Screen[] = [
			createScreen({
				id: "billing.invoice.detail",
				title: "Invoice Detail",
				route: "/billing/invoices/:id",
				owner: ["billing-team"],
				dependsOn: ["InvoiceAPI.getDetail"],
			}),
		]

		const result = analyzeImpact(screens, "InvoiceAPI.getDetail")
		const output = formatImpactText(result)

		expect(output).toContain("Impact Analysis: InvoiceAPI.getDetail")
		expect(output).toContain("Direct (1 screen)")
		expect(output).toContain("billing.invoice.detail")
		expect(output).toContain("/billing/invoices/:id")
		expect(output).toContain("[billing-team]")
	})

	it("should format output when no dependents found", () => {
		const result = analyzeImpact([], "SomeAPI")
		const output = formatImpactText(result)

		expect(output).toContain("No screens depend on this API")
	})
})

describe("formatImpactJson", () => {
	it("should output valid JSON", () => {
		const screens: Screen[] = [
			createScreen({
				id: "test",
				title: "Test",
				route: "/test",
				dependsOn: ["API"],
			}),
		]

		const result = analyzeImpact(screens, "API")
		const output = formatImpactJson(result)

		const parsed = JSON.parse(output)
		expect(parsed.api).toBe("API")
		expect(parsed.summary.totalCount).toBe(1)
		expect(parsed.direct).toHaveLength(1)
		expect(parsed.direct[0].id).toBe("test")
	})
})
