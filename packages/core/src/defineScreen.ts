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
 * })
 * ```
 */
export function defineScreen(input: ScreenInput): Screen {
	return screenSchema.parse(input)
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
