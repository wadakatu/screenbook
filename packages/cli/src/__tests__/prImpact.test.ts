import type { Screen } from "@screenbook/core"
import { describe, expect, it } from "vitest"
import type { ImpactResult } from "../utils/impactAnalysis.js"
import {
	capitalize,
	extractApiNames,
	formatMarkdown,
} from "../utils/prImpact.js"

describe("extractApiNames", () => {
	it("should extract API names from api directory files", () => {
		const files = ["src/api/InvoiceAPI.ts", "src/api/UserApi.ts"]
		const result = extractApiNames(files)
		expect(result).toContain("InvoiceAPI")
		expect(result).toContain("UserApi")
	})

	it("should extract API names from apis directory files", () => {
		const files = ["src/apis/PaymentAPI.ts"]
		const result = extractApiNames(files)
		expect(result).toContain("PaymentAPI")
	})

	it("should extract Service names from services directory", () => {
		const files = ["src/services/BillingService.ts"]
		const result = extractApiNames(files)
		expect(result).toContain("BillingService")
	})

	it("should infer Service name from services/*/index.ts pattern", () => {
		const files = ["src/services/invoice/index.ts"]
		const result = extractApiNames(files)
		expect(result).toContain("InvoiceService")
	})

	it("should infer API name from api/*.ts pattern", () => {
		const files = ["src/api/invoice.ts"]
		const result = extractApiNames(files)
		expect(result).toContain("InvoiceAPI")
	})

	it("should extract files with api/service in filename", () => {
		const files = ["src/utils/apiClient.ts", "src/lib/authService.ts"]
		const result = extractApiNames(files)
		expect(result).toContain("apiClient")
		expect(result).toContain("authService")
	})

	it("should return empty array for non-API files", () => {
		const files = [
			"src/components/Button.tsx",
			"src/pages/home.tsx",
			"README.md",
		]
		const result = extractApiNames(files)
		expect(result).toHaveLength(0)
	})

	it("should return empty array for empty input", () => {
		const result = extractApiNames([])
		expect(result).toHaveLength(0)
	})

	it("should deduplicate and sort API names", () => {
		const files = [
			"src/api/InvoiceAPI.ts",
			"src/apis/InvoiceAPI.ts",
			"src/api/BillingAPI.ts",
		]
		const result = extractApiNames(files)
		expect(result).toEqual(["BillingAPI", "InvoiceAPI"])
	})

	it("should handle various file extensions", () => {
		const files = [
			"src/api/InvoiceAPI.ts",
			"src/api/UserAPI.tsx",
			"src/api/PaymentAPI.js",
			"src/api/OrderAPI.jsx",
		]
		const result = extractApiNames(files)
		expect(result).toContain("InvoiceAPI")
		expect(result).toContain("UserAPI")
		expect(result).toContain("PaymentAPI")
		expect(result).toContain("OrderAPI")
	})
})

describe("capitalize", () => {
	it("should capitalize first letter", () => {
		expect(capitalize("hello")).toBe("Hello")
		expect(capitalize("world")).toBe("World")
	})

	it("should handle already capitalized strings", () => {
		expect(capitalize("Hello")).toBe("Hello")
	})

	it("should handle single character", () => {
		expect(capitalize("a")).toBe("A")
	})

	it("should handle empty string", () => {
		expect(capitalize("")).toBe("")
	})
})

describe("formatMarkdown", () => {
	const createScreen = (overrides: Partial<Screen> = {}): Screen => ({
		id: "test.screen",
		title: "Test Screen",
		route: "/test",
		...overrides,
	})

	it("should format header and no impacts message when results are empty", () => {
		const output = formatMarkdown(["src/api/TestAPI.ts"], ["TestAPI"], [])
		expect(output).toContain("## Screenbook Impact Analysis")
		expect(output).toContain("No screen impacts detected")
		expect(output).toContain("TestAPI")
	})

	it("should format summary with screen count", () => {
		const result: ImpactResult = {
			api: "InvoiceAPI",
			direct: [createScreen({ id: "billing.invoice", route: "/invoices" })],
			transitive: [],
			totalCount: 1,
		}
		const output = formatMarkdown(
			["src/api/InvoiceAPI.ts"],
			["InvoiceAPI"],
			[result],
		)
		expect(output).toContain("**1 screen affected**")
		expect(output).toContain("### InvoiceAPI")
	})

	it("should pluralize screens correctly", () => {
		const result: ImpactResult = {
			api: "InvoiceAPI",
			direct: [
				createScreen({ id: "screen1", route: "/1" }),
				createScreen({ id: "screen2", route: "/2" }),
			],
			transitive: [],
			totalCount: 2,
		}
		const output = formatMarkdown([], ["InvoiceAPI"], [result])
		expect(output).toContain("**2 screens affected**")
	})

	it("should format direct dependencies as table", () => {
		const result: ImpactResult = {
			api: "InvoiceAPI",
			direct: [
				createScreen({
					id: "billing.invoice",
					title: "Invoice",
					route: "/invoices",
					owner: ["billing-team"],
				}),
			],
			transitive: [],
			totalCount: 1,
		}
		const output = formatMarkdown([], ["InvoiceAPI"], [result])
		expect(output).toContain("**Direct dependencies** (1)")
		expect(output).toContain("| Screen | Route | Owner |")
		expect(output).toContain("billing.invoice")
		expect(output).toContain("`/invoices`")
		expect(output).toContain("billing-team")
	})

	it("should show dash for missing owner", () => {
		const result: ImpactResult = {
			api: "InvoiceAPI",
			direct: [createScreen({ id: "test", route: "/test" })],
			transitive: [],
			totalCount: 1,
		}
		const output = formatMarkdown([], ["InvoiceAPI"], [result])
		expect(output).toContain("| - |")
	})

	it("should format transitive dependencies with paths", () => {
		const result: ImpactResult = {
			api: "InvoiceAPI",
			direct: [],
			transitive: [
				{
					screen: createScreen({ id: "payment", route: "/payment" }),
					path: ["invoice", "checkout", "payment"],
				},
			],
			totalCount: 1,
		}
		const output = formatMarkdown([], ["InvoiceAPI"], [result])
		expect(output).toContain("**Transitive dependencies** (1)")
		expect(output).toContain("invoice → checkout → payment")
	})

	it("should include changed files in details section", () => {
		const changedFiles = ["src/api/Test.ts", "src/utils/helper.ts"]
		const result: ImpactResult = {
			api: "TestAPI",
			direct: [createScreen({ id: "test", route: "/test" })],
			transitive: [],
			totalCount: 1,
		}
		const output = formatMarkdown(changedFiles, ["TestAPI"], [result])
		expect(output).toContain("<details>")
		expect(output).toContain(`Changed files (${changedFiles.length})`)
		expect(output).toContain("`src/api/Test.ts`")
	})

	it("should truncate long file lists", () => {
		const changedFiles = Array.from({ length: 25 }, (_, i) => `file${i}.ts`)
		const result: ImpactResult = {
			api: "TestAPI",
			direct: [createScreen({ id: "test", route: "/test" })],
			transitive: [],
			totalCount: 1,
		}
		const output = formatMarkdown(changedFiles, ["TestAPI"], [result])
		expect(output).toContain("... and 5 more")
	})

	it("should handle multiple APIs", () => {
		const results: ImpactResult[] = [
			{
				api: "InvoiceAPI",
				direct: [createScreen({ id: "invoice", route: "/invoice" })],
				transitive: [],
				totalCount: 1,
			},
			{
				api: "PaymentAPI",
				direct: [createScreen({ id: "payment", route: "/payment" })],
				transitive: [],
				totalCount: 1,
			},
		]
		const output = formatMarkdown([], ["InvoiceAPI", "PaymentAPI"], results)
		expect(output).toContain("### InvoiceAPI")
		expect(output).toContain("### PaymentAPI")
		expect(output).toContain("2 APIs")
	})
})
