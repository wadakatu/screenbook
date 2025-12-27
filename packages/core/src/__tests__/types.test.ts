import { describe, expect, it } from "vitest"
import { configSchema, screenSchema } from "../types.js"

describe("screenSchema", () => {
	it("should validate minimal screen", () => {
		const result = screenSchema.safeParse({
			id: "home",
			title: "Home",
			route: "/",
		})

		expect(result.success).toBe(true)
	})

	it("should reject missing id", () => {
		const result = screenSchema.safeParse({
			title: "Home",
			route: "/",
		})

		expect(result.success).toBe(false)
	})

	it("should reject missing title", () => {
		const result = screenSchema.safeParse({
			id: "home",
			route: "/",
		})

		expect(result.success).toBe(false)
	})

	it("should reject missing route", () => {
		const result = screenSchema.safeParse({
			id: "home",
			title: "Home",
		})

		expect(result.success).toBe(false)
	})

	it("should validate links with valid URLs", () => {
		const result = screenSchema.safeParse({
			id: "home",
			title: "Home",
			route: "/",
			links: [
				{ label: "Docs", url: "https://example.com/docs" },
				{ label: "API", url: "http://api.example.com" },
			],
		})

		expect(result.success).toBe(true)
	})

	it("should reject links with invalid URLs", () => {
		const result = screenSchema.safeParse({
			id: "home",
			title: "Home",
			route: "/",
			links: [{ label: "Bad", url: "not-a-valid-url" }],
		})

		expect(result.success).toBe(false)
	})

	it("should accept route with parameters", () => {
		const result = screenSchema.safeParse({
			id: "user.detail",
			title: "User Detail",
			route: "/users/:userId/posts/:postId",
		})

		expect(result.success).toBe(true)
	})

	it("should accept nested id format", () => {
		const result = screenSchema.safeParse({
			id: "billing.invoice.detail.edit",
			title: "Edit Invoice",
			route: "/billing/invoices/:id/edit",
		})

		expect(result.success).toBe(true)
	})
})

describe("configSchema", () => {
	it("should provide default values", () => {
		const result = configSchema.parse({})

		expect(result.screensDir).toBe("src/screens")
		expect(result.outDir).toBe(".screenbook")
		expect(result.metaPattern).toBe("**/screen.meta.ts")
		expect(result.lintIgnore).toEqual([])
	})

	it("should allow partial override", () => {
		const result = configSchema.parse({
			screensDir: "custom/screens",
		})

		expect(result.screensDir).toBe("custom/screens")
		expect(result.outDir).toBe(".screenbook")
	})

	it("should accept routesPattern", () => {
		const result = configSchema.parse({
			routesPattern: "src/pages/**/*.vue",
		})

		expect(result.routesPattern).toBe("src/pages/**/*.vue")
	})

	it("should accept lintIgnore array", () => {
		const result = configSchema.parse({
			lintIgnore: ["**/test/**", "**/fixtures/**"],
		})

		expect(result.lintIgnore).toEqual(["**/test/**", "**/fixtures/**"])
	})
})
