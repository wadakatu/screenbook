import { describe, expect, it } from "vitest"
import { extractNavigationTargets } from "../extractNavigationTargets.js"
import type { ScreenMock } from "../types.js"

describe("extractNavigationTargets", () => {
	it("should extract navigateTo from button elements", () => {
		const mock: ScreenMock = {
			sections: [
				{
					elements: [
						{ type: "button", label: "Edit", navigateTo: "billing.edit" },
						{ type: "button", label: "Delete", navigateTo: "billing.delete" },
					],
				},
			],
		}

		const targets = extractNavigationTargets(mock)
		expect(targets).toEqual(["billing.edit", "billing.delete"])
	})

	it("should extract navigateTo from link elements", () => {
		const mock: ScreenMock = {
			sections: [
				{
					elements: [
						{ type: "link", label: "Back", navigateTo: "billing.list" },
					],
				},
			],
		}

		const targets = extractNavigationTargets(mock)
		expect(targets).toEqual(["billing.list"])
	})

	it("should extract itemNavigateTo from list elements", () => {
		const mock: ScreenMock = {
			sections: [
				{
					elements: [
						{ type: "list", label: "Items", itemNavigateTo: "item.detail" },
					],
				},
			],
		}

		const targets = extractNavigationTargets(mock)
		expect(targets).toEqual(["item.detail"])
	})

	it("should extract rowNavigateTo from table elements", () => {
		const mock: ScreenMock = {
			sections: [
				{
					elements: [
						{
							type: "table",
							label: "Users",
							columns: ["Name", "Email"],
							rowNavigateTo: "user.detail",
						},
					],
				},
			],
		}

		const targets = extractNavigationTargets(mock)
		expect(targets).toEqual(["user.detail"])
	})

	it("should extract from multiple sections", () => {
		const mock: ScreenMock = {
			sections: [
				{
					title: "Header",
					elements: [
						{ type: "button", label: "Edit", navigateTo: "billing.edit" },
					],
				},
				{
					title: "Footer",
					elements: [
						{ type: "link", label: "Back", navigateTo: "billing.list" },
					],
				},
			],
		}

		const targets = extractNavigationTargets(mock)
		expect(targets).toContain("billing.edit")
		expect(targets).toContain("billing.list")
	})

	it("should deduplicate navigation targets", () => {
		const mock: ScreenMock = {
			sections: [
				{
					elements: [
						{ type: "button", label: "Edit", navigateTo: "billing.edit" },
						{ type: "link", label: "Edit Link", navigateTo: "billing.edit" },
					],
				},
			],
		}

		const targets = extractNavigationTargets(mock)
		expect(targets).toEqual(["billing.edit"])
	})

	it("should ignore elements without navigation", () => {
		const mock: ScreenMock = {
			sections: [
				{
					elements: [
						{ type: "text", label: "Title", variant: "heading" },
						{ type: "input", label: "Email", inputType: "email" },
						{ type: "image", label: "Logo", aspectRatio: "16:9" },
						{ type: "button", label: "Submit" }, // No navigateTo
					],
				},
			],
		}

		const targets = extractNavigationTargets(mock)
		expect(targets).toEqual([])
	})

	it("should handle mixed elements with and without navigation", () => {
		const mock: ScreenMock = {
			sections: [
				{
					elements: [
						{ type: "text", label: "Invoice Detail", variant: "heading" },
						{ type: "button", label: "Edit", navigateTo: "billing.edit" },
						{ type: "input", label: "Notes" },
						{ type: "button", label: "Pay", variant: "primary", navigateTo: "payment.start" },
						{ type: "link", label: "Back", navigateTo: "billing.list" },
					],
				},
			],
		}

		const targets = extractNavigationTargets(mock)
		expect(targets).toHaveLength(3)
		expect(targets).toContain("billing.edit")
		expect(targets).toContain("payment.start")
		expect(targets).toContain("billing.list")
	})
})
