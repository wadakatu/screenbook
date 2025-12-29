import { describe, expect, it } from "vitest"
import { extractNavigationTargets } from "../extractNavigationTargets.js"
import type { ScreenMock } from "../types.js"

describe("extractNavigationTargets", () => {
	it("should return empty array for mock with no navigation targets", () => {
		const mock: ScreenMock = {
			sections: [
				{
					elements: [
						{ type: "text", label: "Hello" },
						{ type: "input", label: "Email" },
					],
				},
			],
		}

		expect(extractNavigationTargets(mock)).toEqual([])
	})

	it("should extract navigateTo from button elements", () => {
		const mock: ScreenMock = {
			sections: [
				{
					elements: [
						{
							type: "button",
							label: "Edit",
							navigateTo: "billing.invoice.edit",
						},
						{ type: "button", label: "Delete" },
					],
				},
			],
		}

		expect(extractNavigationTargets(mock)).toEqual(["billing.invoice.edit"])
	})

	it("should extract navigateTo from link elements", () => {
		const mock: ScreenMock = {
			sections: [
				{
					elements: [
						{
							type: "link",
							label: "Back",
							navigateTo: "billing.invoice.list",
						},
					],
				},
			],
		}

		expect(extractNavigationTargets(mock)).toEqual(["billing.invoice.list"])
	})

	it("should extract itemNavigateTo from list elements", () => {
		const mock: ScreenMock = {
			sections: [
				{
					elements: [
						{
							type: "list",
							label: "Items",
							itemNavigateTo: "billing.item.detail",
						},
					],
				},
			],
		}

		expect(extractNavigationTargets(mock)).toEqual(["billing.item.detail"])
	})

	it("should extract rowNavigateTo from table elements", () => {
		const mock: ScreenMock = {
			sections: [
				{
					elements: [
						{
							type: "table",
							label: "Invoices",
							columns: ["ID", "Amount"],
							rowNavigateTo: "billing.invoice.detail",
						},
					],
				},
			],
		}

		expect(extractNavigationTargets(mock)).toEqual(["billing.invoice.detail"])
	})

	it("should extract targets from multiple sections", () => {
		const mock: ScreenMock = {
			sections: [
				{
					title: "Header",
					elements: [
						{ type: "button", label: "Edit", navigateTo: "screen.edit" },
					],
				},
				{
					title: "Content",
					elements: [
						{ type: "list", label: "Items", itemNavigateTo: "item.detail" },
					],
				},
			],
		}

		const targets = extractNavigationTargets(mock)
		expect(targets).toContain("screen.edit")
		expect(targets).toContain("item.detail")
		expect(targets).toHaveLength(2)
	})

	it("should deduplicate targets", () => {
		const mock: ScreenMock = {
			sections: [
				{
					elements: [
						{ type: "button", label: "Edit", navigateTo: "same.screen" },
						{ type: "link", label: "Also Edit", navigateTo: "same.screen" },
					],
				},
			],
		}

		expect(extractNavigationTargets(mock)).toEqual(["same.screen"])
	})

	it("should handle complex mock with all navigation types", () => {
		const mock: ScreenMock = {
			sections: [
				{
					title: "Header",
					layout: "horizontal",
					elements: [
						{ type: "text", label: "Invoice #123", variant: "heading" },
						{
							type: "button",
							label: "Edit",
							navigateTo: "billing.invoice.edit",
							variant: "secondary",
						},
					],
				},
				{
					title: "Details",
					elements: [
						{ type: "text", label: "Customer: Acme Corp" },
						{
							type: "list",
							label: "Line Items",
							itemCount: 5,
							itemNavigateTo: "billing.lineitem.detail",
						},
					],
				},
				{
					title: "Actions",
					layout: "horizontal",
					elements: [
						{
							type: "button",
							label: "Pay Now",
							variant: "primary",
							navigateTo: "billing.payment.start",
						},
						{
							type: "link",
							label: "Back to List",
							navigateTo: "billing.invoice.list",
						},
					],
				},
			],
		}

		const targets = extractNavigationTargets(mock)
		expect(targets).toContain("billing.invoice.edit")
		expect(targets).toContain("billing.lineitem.detail")
		expect(targets).toContain("billing.payment.start")
		expect(targets).toContain("billing.invoice.list")
		expect(targets).toHaveLength(4)
	})

	it("should extract targets from nested child sections", () => {
		const mock: ScreenMock = {
			sections: [
				{
					title: "Parent Section",
					elements: [
						{
							type: "button",
							label: "Parent Button",
							navigateTo: "parent.target",
						},
					],
					children: [
						{
							title: "Child Section",
							elements: [
								{
									type: "button",
									label: "Child Button",
									navigateTo: "child.target",
								},
							],
							children: [
								{
									title: "Grandchild Section",
									elements: [
										{
											type: "link",
											label: "Deep Link",
											navigateTo: "grandchild.target",
										},
									],
								},
							],
						},
					],
				},
			],
		}

		const targets = extractNavigationTargets(mock)
		expect(targets).toContain("parent.target")
		expect(targets).toContain("child.target")
		expect(targets).toContain("grandchild.target")
		expect(targets).toHaveLength(3)
	})
})
