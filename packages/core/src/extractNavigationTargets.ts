import type { ScreenMock } from "./types.js"

/**
 * Extracts all navigation targets from a mock definition.
 * Collects all `navigateTo`, `itemNavigateTo`, and `rowNavigateTo` values
 * from mock elements to determine screen navigation targets.
 *
 * @param mock - The screen mock definition
 * @returns Array of unique screen IDs that this screen can navigate to
 *
 * @example
 * ```ts
 * const targets = extractNavigationTargets({
 *   sections: [
 *     {
 *       elements: [
 *         { type: "button", label: "Edit", navigateTo: "billing.edit" },
 *         { type: "link", label: "Back", navigateTo: "billing.list" },
 *       ],
 *     },
 *   ],
 * })
 * // => ["billing.edit", "billing.list"]
 * ```
 */
export function extractNavigationTargets(mock: ScreenMock): string[] {
	const targets = new Set<string>()

	for (const section of mock.sections) {
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
	}

	return Array.from(targets)
}
