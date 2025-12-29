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

	describe("mock feature", () => {
		it("should accept a screen with mock definition", () => {
			const screen = defineScreen({
				id: "billing.invoice.detail",
				title: "Invoice Detail",
				route: "/billing/invoices/:id",
				mock: {
					sections: [
						{
							title: "Header",
							layout: "horizontal",
							elements: [
								{ type: "text", label: "Invoice #123", variant: "heading" },
								{ type: "button", label: "Edit", navigateTo: "billing.invoice.edit" },
							],
						},
					],
				},
			})

			expect(screen.mock).toBeDefined()
			expect(screen.mock?.sections).toHaveLength(1)
			expect(screen.mock?.sections[0]?.title).toBe("Header")
		})

		it("should auto-derive next from mock navigateTo", () => {
			const screen = defineScreen({
				id: "billing.invoice.detail",
				title: "Invoice Detail",
				route: "/billing/invoices/:id",
				mock: {
					sections: [
						{
							elements: [
								{ type: "button", label: "Edit", navigateTo: "billing.invoice.edit" },
								{ type: "button", label: "Pay", navigateTo: "billing.payment.start" },
								{ type: "link", label: "Back", navigateTo: "billing.invoice.list" },
							],
						},
					],
				},
			})

			expect(screen.next).toBeDefined()
			expect(screen.next).toContain("billing.invoice.edit")
			expect(screen.next).toContain("billing.payment.start")
			expect(screen.next).toContain("billing.invoice.list")
		})

		it("should use manual next when mock is not provided", () => {
			const screen = defineScreen({
				id: "billing.invoice.detail",
				title: "Invoice Detail",
				route: "/billing/invoices/:id",
				next: ["billing.invoice.edit"],
			})

			expect(screen.next).toEqual(["billing.invoice.edit"])
		})

		it("should override manual next with mock navigateTo when mock is provided", () => {
			const screen = defineScreen({
				id: "billing.invoice.detail",
				title: "Invoice Detail",
				route: "/billing/invoices/:id",
				next: ["manual.target"], // This should be overridden
				mock: {
					sections: [
						{
							elements: [
								{ type: "button", label: "Edit", navigateTo: "billing.invoice.edit" },
							],
						},
					],
				},
			})

			expect(screen.next).toEqual(["billing.invoice.edit"])
			expect(screen.next).not.toContain("manual.target")
		})

		it("should not set next when mock has no navigation targets", () => {
			const screen = defineScreen({
				id: "static.page",
				title: "Static Page",
				route: "/static",
				mock: {
					sections: [
						{
							elements: [
								{ type: "text", label: "Hello World", variant: "heading" },
								{ type: "text", label: "Some content" },
							],
						},
					],
				},
			})

			expect(screen.next).toBeUndefined()
		})

		it("should validate mock element types", () => {
			const screen = defineScreen({
				id: "test",
				title: "Test",
				route: "/test",
				mock: {
					sections: [
						{
							elements: [
								{ type: "button", label: "Button", variant: "primary" },
								{ type: "input", label: "Input", inputType: "email" },
								{ type: "link", label: "Link" },
								{ type: "text", label: "Text", variant: "heading" },
								{ type: "image", label: "Image", aspectRatio: "16:9" },
								{ type: "list", label: "List", itemCount: 5 },
								{ type: "table", label: "Table", columns: ["A", "B"], rowCount: 3 },
							],
						},
					],
				},
			})

			expect(screen.mock?.sections[0]?.elements).toHaveLength(7)
		})

		it("should throw error for invalid mock element type", () => {
			expect(() =>
				defineScreen({
					id: "test",
					title: "Test",
					route: "/test",
					mock: {
						sections: [
							{
								elements: [
									// @ts-expect-error - Testing invalid type
									{ type: "invalid", label: "Invalid" },
								],
							},
						],
					},
				}),
			).toThrow()
		})

		it("should throw error for empty sections array", () => {
			expect(() =>
				defineScreen({
					id: "test",
					title: "Test",
					route: "/test",
					mock: {
						sections: [],
					},
				}),
			).toThrow()
		})

		it("should throw error for empty elements array in section", () => {
			expect(() =>
				defineScreen({
					id: "test",
					title: "Test",
					route: "/test",
					mock: {
						sections: [
							{
								elements: [],
							},
						],
					},
				}),
			).toThrow()
		})
	})
})
