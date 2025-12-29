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
 * When a `mock` is defined, navigation targets (navigateTo, itemNavigateTo,
 * rowNavigateTo) are automatically extracted and merged into the `next` array.
 *
 * @example
 * ```ts
 * export const screen = defineScreen({
 *   id: "billing.invoice.detail",
 *   title: "Invoice Detail",
 *   route: "/billing/invoices/:id",
 *   owner: ["billing"],
 *   tags: ["billing", "invoice"],
 *   dependsOn: ["InvoiceAPI.getDetail"],
 *   entryPoints: ["billing.invoice.list"],
 *   next: ["billing.invoice.edit"],
 *   mock: {
 *     sections: [{
 *       elements: [
 *         { type: "button", label: "Pay", navigateTo: "billing.payment.start" },
 *       ],
 *     }],
 *   },
 * })
 * // next will be ["billing.invoice.edit", "billing.payment.start"]
 * ```
 */
export function defineScreen(input: ScreenInput): Screen {
	const validated = screenSchema.parse(input)

	// Auto-derive next from mock if mock exists
	if (validated.mock) {
		const mockTargets = extractNavigationTargets(validated.mock)
		if (mockTargets.length > 0) {
			// Merge with existing next, avoiding duplicates
			const existingNext = validated.next ?? []
			const mergedNext = [...new Set([...existingNext, ...mockTargets])]
			validated.next = mergedNext
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
