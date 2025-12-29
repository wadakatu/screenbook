import type { MockSection, ScreenMock } from "./types.js"

/**
 * Extracts all navigation target screen IDs from a mock definition.
 *
 * This function collects all `navigateTo`, `itemNavigateTo`, and `rowNavigateTo`
 * values from mock elements to automatically derive the `next` array.
 * It recursively processes child sections.
 *
 * @param mock - The screen mock definition
 * @returns Array of unique screen IDs that can be navigated to
 *
 * @example
 * ```ts
 * const mock = {
 *   sections: [{
 *     elements: [
 *       { type: "button", label: "Edit", navigateTo: "billing.invoice.edit" },
 *       { type: "list", label: "Items", itemNavigateTo: "billing.item.detail" },
 *     ]
 *   }]
 * }
 * extractNavigationTargets(mock)
 * // => ["billing.invoice.edit", "billing.item.detail"]
 * ```
 */
export function extractNavigationTargets(mock: ScreenMock): string[] {
	const targets = new Set<string>()

	function processSection(section: MockSection): void {
		for (const element of section.elements) {
			// Button and Link elements have navigateTo
			if ("navigateTo" in element && element.navigateTo) {
				targets.add(element.navigateTo)
			}

			// List elements have itemNavigateTo
			if ("itemNavigateTo" in element && element.itemNavigateTo) {
				targets.add(element.itemNavigateTo)
			}

			// Table elements have rowNavigateTo
			if ("rowNavigateTo" in element && element.rowNavigateTo) {
				targets.add(element.rowNavigateTo)
			}
		}

		// Recursively process child sections
		if (section.children) {
			for (const child of section.children) {
				processSection(child)
			}
		}
	}

	for (const section of mock.sections) {
		processSection(section)
	}

	return Array.from(targets)
}
