import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import {
	getAllApiIdentifiers,
	parseOpenApiSpecs,
} from "../utils/openApiParser.js"

const fixturesDir = resolve(__dirname, "fixtures/openapi")

describe("parseOpenApiSpecs", () => {
	describe("OpenAPI 3.x YAML parsing", () => {
		it("parses operationIds from YAML file", async () => {
			const result = await parseOpenApiSpecs(["simple.yaml"], fixturesDir)

			expect(result.errors).toHaveLength(0)
			expect(result.specs).toHaveLength(1)

			const spec = result.specs[0]!
			expect(spec.operationIds.has("getUsers")).toBe(true)
			expect(spec.operationIds.has("createUser")).toBe(true)
			expect(spec.operationIds.has("getUserById")).toBe(true)
			expect(spec.operationIds.has("updateUser")).toBe(true)
			expect(spec.operationIds.has("deleteUser")).toBe(true)
			expect(spec.operationIds.has("getInvoices")).toBe(true)
			expect(spec.operationIds.has("getInvoiceById")).toBe(true)
		})

		it("extracts HTTP endpoints from YAML file", async () => {
			const result = await parseOpenApiSpecs(["simple.yaml"], fixturesDir)

			const spec = result.specs[0]!
			expect(spec.httpEndpoints.has("GET /api/users")).toBe(true)
			expect(spec.httpEndpoints.has("POST /api/users")).toBe(true)
			expect(spec.httpEndpoints.has("GET /api/users/{id}")).toBe(true)
			expect(spec.httpEndpoints.has("PUT /api/users/{id}")).toBe(true)
			expect(spec.httpEndpoints.has("DELETE /api/users/{id}")).toBe(true)
		})

		it("creates normalized mappings for case-insensitive matching", async () => {
			const result = await parseOpenApiSpecs(["simple.yaml"], fixturesDir)

			const spec = result.specs[0]!
			// OperationIds should have lowercase mappings
			expect(spec.normalizedToOriginal.has("getusers")).toBe(true)
			expect(spec.normalizedToOriginal.get("getusers")).toBe("getUsers")

			// HTTP endpoints should have lowercase mappings
			expect(spec.normalizedToOriginal.has("get /api/users")).toBe(true)
			expect(spec.normalizedToOriginal.get("get /api/users")).toBe(
				"GET /api/users",
			)
		})
	})

	describe("Swagger 2.0 JSON parsing", () => {
		it("parses operationIds from Swagger 2.0 JSON file", async () => {
			const result = await parseOpenApiSpecs(["swagger2.json"], fixturesDir)

			expect(result.errors).toHaveLength(0)
			expect(result.specs).toHaveLength(1)

			const spec = result.specs[0]!
			expect(spec.operationIds.has("listPayments")).toBe(true)
			expect(spec.operationIds.has("createPayment")).toBe(true)
			expect(spec.operationIds.has("getPaymentById")).toBe(true)
		})

		it("extracts HTTP endpoints from Swagger 2.0 JSON file", async () => {
			const result = await parseOpenApiSpecs(["swagger2.json"], fixturesDir)

			const spec = result.specs[0]!
			expect(spec.httpEndpoints.has("GET /api/payments")).toBe(true)
			expect(spec.httpEndpoints.has("POST /api/payments")).toBe(true)
			expect(spec.httpEndpoints.has("GET /api/payments/{id}")).toBe(true)
		})
	})

	describe("multiple sources", () => {
		it("parses multiple spec files", async () => {
			const result = await parseOpenApiSpecs(
				["simple.yaml", "swagger2.json"],
				fixturesDir,
			)

			expect(result.errors).toHaveLength(0)
			expect(result.specs).toHaveLength(2)

			// Verify both specs have their operationIds
			const allOperationIds = result.specs.flatMap((s) =>
				Array.from(s.operationIds),
			)
			expect(allOperationIds).toContain("getUsers")
			expect(allOperationIds).toContain("listPayments")
		})
	})

	describe("error handling", () => {
		it("collects errors for non-existent files", async () => {
			const result = await parseOpenApiSpecs(["non-existent.yaml"], fixturesDir)

			expect(result.errors).toHaveLength(1)
			expect(result.errors[0]!.source).toBe("non-existent.yaml")
			expect(result.specs).toHaveLength(0)
		})

		it("continues parsing other files when one fails", async () => {
			const result = await parseOpenApiSpecs(
				["simple.yaml", "non-existent.yaml"],
				fixturesDir,
			)

			expect(result.errors).toHaveLength(1)
			expect(result.errors[0]!.source).toBe("non-existent.yaml")
			expect(result.specs).toHaveLength(1)
			expect(result.specs[0]!.source).toBe("simple.yaml")
		})
	})

	describe("path resolution", () => {
		it("resolves relative paths from cwd", async () => {
			const result = await parseOpenApiSpecs(
				["fixtures/openapi/simple.yaml"],
				__dirname,
			)

			expect(result.errors).toHaveLength(0)
			expect(result.specs).toHaveLength(1)
		})

		it("handles absolute paths", async () => {
			const absolutePath = resolve(fixturesDir, "simple.yaml")
			const result = await parseOpenApiSpecs([absolutePath], "/some/other/dir")

			expect(result.errors).toHaveLength(0)
			expect(result.specs).toHaveLength(1)
		})
	})
})

describe("getAllApiIdentifiers", () => {
	it("returns all operationIds and httpEndpoints from specs", async () => {
		const result = await parseOpenApiSpecs(
			["simple.yaml", "swagger2.json"],
			fixturesDir,
		)

		const identifiers = getAllApiIdentifiers(result.specs)

		// Should contain operationIds
		expect(identifiers).toContain("getUsers")
		expect(identifiers).toContain("listPayments")

		// Should contain HTTP endpoints
		expect(identifiers).toContain("GET /api/users")
		expect(identifiers).toContain("GET /api/payments")
	})

	it("returns empty array for empty specs", () => {
		const identifiers = getAllApiIdentifiers([])
		expect(identifiers).toEqual([])
	})
})
