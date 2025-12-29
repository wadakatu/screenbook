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
							elements: [{ type: "text", label: "Invoice Details" }],
						},
					],
				},
			})

			expect(screen.mock).toBeDefined()
			expect(screen.mock?.sections).toHaveLength(1)
		})

		it("should auto-generate next from mock navigateTo", () => {
			const screen = defineScreen({
				id: "billing.invoice.detail",
				title: "Invoice Detail",
				route: "/billing/invoices/:id",
				mock: {
					sections: [
						{
							elements: [
								{
									type: "button",
									label: "Edit",
									navigateTo: "billing.invoice.edit",
								},
								{
									type: "link",
									label: "Back",
									navigateTo: "billing.invoice.list",
								},
							],
						},
					],
				},
			})

			expect(screen.next).toContain("billing.invoice.edit")
			expect(screen.next).toContain("billing.invoice.list")
		})

		it("should merge mock targets with existing next", () => {
			const screen = defineScreen({
				id: "billing.invoice.detail",
				title: "Invoice Detail",
				route: "/billing/invoices/:id",
				next: ["billing.payment.start"],
				mock: {
					sections: [
						{
							elements: [
								{
									type: "button",
									label: "Edit",
									navigateTo: "billing.invoice.edit",
								},
							],
						},
					],
				},
			})

			expect(screen.next).toContain("billing.payment.start")
			expect(screen.next).toContain("billing.invoice.edit")
			expect(screen.next).toHaveLength(2)
		})

		it("should deduplicate when mock target overlaps with next", () => {
			const screen = defineScreen({
				id: "billing.invoice.detail",
				title: "Invoice Detail",
				route: "/billing/invoices/:id",
				next: ["billing.invoice.edit"],
				mock: {
					sections: [
						{
							elements: [
								{
									type: "button",
									label: "Edit",
									navigateTo: "billing.invoice.edit",
								},
							],
						},
					],
				},
			})

			expect(screen.next).toEqual(["billing.invoice.edit"])
		})

		it("should extract itemNavigateTo from list elements", () => {
			const screen = defineScreen({
				id: "billing.invoice.list",
				title: "Invoice List",
				route: "/billing/invoices",
				mock: {
					sections: [
						{
							elements: [
								{
									type: "list",
									label: "Invoices",
									itemNavigateTo: "billing.invoice.detail",
								},
							],
						},
					],
				},
			})

			expect(screen.next).toContain("billing.invoice.detail")
		})

		it("should extract rowNavigateTo from table elements", () => {
			const screen = defineScreen({
				id: "billing.invoice.list",
				title: "Invoice List",
				route: "/billing/invoices",
				mock: {
					sections: [
						{
							elements: [
								{
									type: "table",
									label: "Invoices Table",
									columns: ["ID", "Amount", "Status"],
									rowNavigateTo: "billing.invoice.detail",
								},
							],
						},
					],
				},
			})

			expect(screen.next).toContain("billing.invoice.detail")
		})

		it("should not modify next when mock has no navigation targets", () => {
			const screen = defineScreen({
				id: "billing.invoice.detail",
				title: "Invoice Detail",
				route: "/billing/invoices/:id",
				mock: {
					sections: [
						{
							elements: [
								{ type: "text", label: "Hello" },
								{ type: "input", label: "Email" },
							],
						},
					],
				},
			})

			expect(screen.next).toBeUndefined()
		})

		it("should throw error for invalid mock element type", () => {
			expect(() =>
				defineScreen({
					id: "home",
					title: "Home",
					route: "/",
					mock: {
						sections: [
							{
								elements: [
									// @ts-expect-error - Testing invalid type
									{ type: "invalid", label: "Test" },
								],
							},
						],
					},
				}),
			).toThrow()
		})

		it("should throw error for mock element without label", () => {
			expect(() =>
				defineScreen({
					id: "home",
					title: "Home",
					route: "/",
					mock: {
						sections: [
							{
								elements: [
									// @ts-expect-error - Testing missing label
									{ type: "button" },
								],
							},
						],
					},
				}),
			).toThrow()
		})

		it("should extract navigation targets from child sections", () => {
			const screen = defineScreen({
				id: "billing.invoice.detail",
				title: "Invoice Detail",
				route: "/billing/invoices/:id",
				mock: {
					sections: [
						{
							title: "Parent",
							elements: [
								{
									type: "button",
									label: "Parent Action",
									navigateTo: "parent.target",
								},
							],
							children: [
								{
									title: "Child",
									elements: [
										{
											type: "button",
											label: "Child Action",
											navigateTo: "child.target",
										},
									],
								},
							],
						},
					],
				},
			})

			expect(screen.next).toContain("parent.target")
			expect(screen.next).toContain("child.target")
			expect(screen.next).toHaveLength(2)
		})

		it("should extract navigation targets from deeply nested child sections", () => {
			const screen = defineScreen({
				id: "complex.screen",
				title: "Complex Screen",
				route: "/complex",
				mock: {
					sections: [
						{
							title: "Level 0",
							elements: [
								{ type: "link", label: "L0 Link", navigateTo: "level0.target" },
							],
							children: [
								{
									title: "Level 1",
									elements: [
										{
											type: "list",
											label: "L1 List",
											itemNavigateTo: "level1.target",
										},
									],
									children: [
										{
											title: "Level 2",
											elements: [
												{
													type: "table",
													label: "L2 Table",
													columns: ["Col"],
													rowNavigateTo: "level2.target",
												},
											],
										},
									],
								},
							],
						},
					],
				},
			})

			expect(screen.next).toContain("level0.target")
			expect(screen.next).toContain("level1.target")
			expect(screen.next).toContain("level2.target")
			expect(screen.next).toHaveLength(3)
		})

		it("should handle mock with empty child sections array", () => {
			const screen = defineScreen({
				id: "home",
				title: "Home",
				route: "/",
				mock: {
					sections: [
						{
							title: "Section",
							elements: [{ type: "text", label: "Hello" }],
							children: [],
						},
					],
				},
			})

			expect(screen.next).toBeUndefined()
		})

		it("should deduplicate targets from parent and child sections", () => {
			const screen = defineScreen({
				id: "home",
				title: "Home",
				route: "/",
				mock: {
					sections: [
						{
							elements: [
								{
									type: "button",
									label: "Go",
									navigateTo: "same.target",
								},
							],
							children: [
								{
									elements: [
										{
											type: "link",
											label: "Also Go",
											navigateTo: "same.target",
										},
									],
								},
							],
						},
					],
				},
			})

			expect(screen.next).toEqual(["same.target"])
		})
	})
})
