import { describe, expect, it } from "vitest"
import { defineScreen } from "../defineScreen.js"

describe("defineScreen", () => {
	it("should create a screen with required fields only", () => {
		const screen = defineScreen({
			id: "home",
			title: "Home",
			route: "/",
		})

		expect(screen).toEqual({
			id: "home",
			title: "Home",
			route: "/",
		})
	})

	it("should create a screen with all fields", () => {
		const screen = defineScreen({
			id: "billing.invoice.detail",
			title: "Invoice Detail",
			route: "/billing/invoices/:id",
			owner: ["billing-team"],
			tags: ["billing", "invoice"],
			dependsOn: ["InvoiceAPI.getDetail", "PaymentAPI.getStatus"],
			entryPoints: ["billing.invoice.list"],
			next: ["billing.invoice.edit", "billing.payment.start"],
			description: "Displays invoice details",
			links: [
				{ label: "Figma", url: "https://figma.com/file/xxx" },
				{ label: "Storybook", url: "https://storybook.example.com/invoice" },
			],
		})

		expect(screen.id).toBe("billing.invoice.detail")
		expect(screen.owner).toEqual(["billing-team"])
		expect(screen.tags).toEqual(["billing", "invoice"])
		expect(screen.links).toHaveLength(2)
	})

	it("should throw error for empty id", () => {
		expect(() =>
			defineScreen({
				id: "",
				title: "Home",
				route: "/",
			}),
		).toThrow()
	})

	it("should throw error for empty title", () => {
		expect(() =>
			defineScreen({
				id: "home",
				title: "",
				route: "/",
			}),
		).toThrow()
	})

	it("should throw error for empty route", () => {
		expect(() =>
			defineScreen({
				id: "home",
				title: "Home",
				route: "",
			}),
		).toThrow()
	})

	it("should throw error for invalid link URL", () => {
		expect(() =>
			defineScreen({
				id: "home",
				title: "Home",
				route: "/",
				links: [{ label: "Invalid", url: "not-a-url" }],
			}),
		).toThrow()
	})

	it("should allow empty arrays for optional array fields", () => {
		const screen = defineScreen({
			id: "home",
			title: "Home",
			route: "/",
			owner: [],
			tags: [],
			dependsOn: [],
			entryPoints: [],
			next: [],
			links: [],
		})

		expect(screen.owner).toEqual([])
		expect(screen.tags).toEqual([])
	})
})
