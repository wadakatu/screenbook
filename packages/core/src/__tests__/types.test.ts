import { describe, expect, it } from "vitest"
import {
	configSchema,
	generateConfigSchema,
	lintConfigSchema,
	screenSchema,
} from "../types.js"

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

describe("lintConfigSchema", () => {
	it("should provide default values", () => {
		const result = lintConfigSchema.parse({})

		expect(result.orphans).toBe("warn")
		expect(result.spreadOperator).toBe("warn")
	})

	it("should accept valid orphans values", () => {
		expect(lintConfigSchema.parse({ orphans: "warn" }).orphans).toBe("warn")
		expect(lintConfigSchema.parse({ orphans: "off" }).orphans).toBe("off")
		expect(lintConfigSchema.parse({ orphans: "error" }).orphans).toBe("error")
	})

	it("should accept valid spreadOperator values", () => {
		expect(
			lintConfigSchema.parse({ spreadOperator: "warn" }).spreadOperator,
		).toBe("warn")
		expect(
			lintConfigSchema.parse({ spreadOperator: "off" }).spreadOperator,
		).toBe("off")
		expect(
			lintConfigSchema.parse({ spreadOperator: "error" }).spreadOperator,
		).toBe("error")
	})

	it("should reject invalid orphans values", () => {
		const result = lintConfigSchema.safeParse({ orphans: "invalid" })
		expect(result.success).toBe(false)
	})

	it("should reject invalid spreadOperator values", () => {
		const result = lintConfigSchema.safeParse({ spreadOperator: "invalid" })
		expect(result.success).toBe(false)
	})
})

describe("generateConfigSchema", () => {
	it("should provide default values", () => {
		const result = generateConfigSchema.parse({})

		expect(result.smartParameterNaming).toBe(false)
		expect(result.unmappedParameterStrategy).toBe("preserve")
	})

	it("should accept valid smartParameterNaming boolean", () => {
		expect(
			generateConfigSchema.parse({ smartParameterNaming: true })
				.smartParameterNaming,
		).toBe(true)
		expect(
			generateConfigSchema.parse({ smartParameterNaming: false })
				.smartParameterNaming,
		).toBe(false)
	})

	it("should accept valid parameterMapping object", () => {
		const result = generateConfigSchema.parse({
			parameterMapping: { ":id": "detail", ":userId": "user" },
		})

		expect(result.parameterMapping).toEqual({
			":id": "detail",
			":userId": "user",
		})
	})

	it("should accept valid unmappedParameterStrategy values", () => {
		expect(
			generateConfigSchema.parse({ unmappedParameterStrategy: "preserve" })
				.unmappedParameterStrategy,
		).toBe("preserve")
		expect(
			generateConfigSchema.parse({ unmappedParameterStrategy: "detail" })
				.unmappedParameterStrategy,
		).toBe("detail")
		expect(
			generateConfigSchema.parse({ unmappedParameterStrategy: "warn" })
				.unmappedParameterStrategy,
		).toBe("warn")
	})

	it("should reject invalid unmappedParameterStrategy values", () => {
		const result = generateConfigSchema.safeParse({
			unmappedParameterStrategy: "invalid",
		})
		expect(result.success).toBe(false)
	})

	it("should reject non-boolean smartParameterNaming", () => {
		const result = generateConfigSchema.safeParse({
			smartParameterNaming: "true",
		})
		expect(result.success).toBe(false)
	})
})
