import { extractNavigationTargets } from "./extractNavigationTargets.js"
import {
	type Config,
	type ConfigInput,
	configSchema,
	type Screen,
	type ScreenInput,
	screenSchema,
} from "./types.js"

/**
 * Define a screen with metadata for the screen catalog.
 *
 * When a `mock` definition is provided, navigation targets (`navigateTo`, `itemNavigateTo`, `rowNavigateTo`)
 * are automatically extracted and used as the `next` field. If `mock` is not provided,
 * the manually defined `next` field is used instead.
 *
 * @example
 * ```ts
 * // Without mock - manual next definition
 * export const screen = defineScreen({
 *   id: "billing.invoice.detail",
 *   title: "Invoice Detail",
 *   route: "/billing/invoices/:id",
 *   next: ["billing.invoice.edit"],
 * })
 *
 * // With mock - next is auto-derived from navigateTo
 * export const screen = defineScreen({
 *   id: "billing.invoice.detail",
 *   title: "Invoice Detail",
 *   route: "/billing/invoices/:id",
 *   mock: {
 *     sections: [
 *       {
 *         elements: [
 *           { type: "button", label: "Edit", navigateTo: "billing.invoice.edit" },
 *         ],
 *       },
 *     ],
 *   },
 * })
 * // => next is automatically ["billing.invoice.edit"]
 * ```
 */
export function defineScreen(input: ScreenInput): Screen {
	const validated = screenSchema.parse(input)

	// Auto-derive next from mock if mock exists
	if (validated.mock) {
		const mockTargets = extractNavigationTargets(validated.mock)
		if (mockTargets.length > 0) {
			validated.next = mockTargets
		}
	}

	return validated
}

/**
 * Define Screenbook configuration.
 *
 * @example
 * ```ts
 * export default defineConfig({
 *   screensDir: "src/screens",
 *   outDir: ".screenbook",
 *   metaPattern: "**\/screen.meta.ts",
 * })
 * ```
 */
export function defineConfig(input: ConfigInput = {}): Config {
	return configSchema.parse(input)
}
