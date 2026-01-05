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

	it("should validate links with type field", () => {
		const result = screenSchema.safeParse({
			id: "home",
			title: "Home",
			route: "/",
			links: [
				{ label: "Figma", url: "https://figma.com/file/xxx", type: "figma" },
				{
					label: "Storybook",
					url: "https://storybook.example.com",
					type: "storybook",
				},
				{ label: "Docs", url: "https://docs.example.com", type: "docs" },
				{ label: "Other", url: "https://example.com", type: "other" },
			],
		})

		expect(result.success).toBe(true)
	})

	it("should accept links without type field (backward compatibility)", () => {
		const result = screenSchema.safeParse({
			id: "home",
			title: "Home",
			route: "/",
			links: [{ label: "Link", url: "https://example.com" }],
		})

		expect(result.success).toBe(true)
	})

	it("should reject links with invalid type value", () => {
		const result = screenSchema.safeParse({
			id: "home",
			title: "Home",
			route: "/",
			links: [
				{ label: "Bad", url: "https://example.com", type: "invalid-type" },
			],
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

		expect(result.outDir).toBe(".screenbook")
		expect(result.metaPattern).toBe("src/**/screen.meta.ts")
		expect(result.ignore).toEqual(["**/node_modules/**", "**/.git/**"])
	})

	it("should allow partial override", () => {
		const result = configSchema.parse({
			metaPattern: "custom/**/screen.meta.ts",
		})

		expect(result.metaPattern).toBe("custom/**/screen.meta.ts")
		expect(result.outDir).toBe(".screenbook")
	})

	it("should accept routesPattern", () => {
		const result = configSchema.parse({
			routesPattern: "src/pages/**/*.vue",
		})

		expect(result.routesPattern).toBe("src/pages/**/*.vue")
	})

	it("should accept ignore array", () => {
		const result = configSchema.parse({
			ignore: ["**/test/**", "**/fixtures/**"],
		})

		expect(result.ignore).toEqual(["**/test/**", "**/fixtures/**"])
	})
})
