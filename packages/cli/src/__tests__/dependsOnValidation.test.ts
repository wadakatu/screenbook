import { resolve } from "node:path"
import type { Screen } from "@screenbook/core"
import { describe, expect, it } from "vitest"
import { validateDependsOnReferences } from "../utils/dependsOnValidation.js"
import { parseOpenApiSpecs } from "../utils/openApiParser.js"

const fixturesDir = resolve(__dirname, "fixtures/openapi")

// Helper to create a minimal screen for testing
function createScreen(
	id: string,
	dependsOn: string[] | undefined,
): Partial<Screen> {
	return {
		id,
		title: id,
		route: `/${id}`,
		dependsOn,
	}
}

describe("validateDependsOnReferences", () => {
	describe("operationId matching", () => {
		it("validates exact operationId matches", async () => {
			const { specs } = await parseOpenApiSpecs(["simple.yaml"], fixturesDir)

			const screens = [
				createScreen("test.screen", ["getUsers", "getUserById"]),
			] as Screen[]

			const result = validateDependsOnReferences(screens, specs)

			expect(result.valid).toBe(true)
			expect(result.errors).toHaveLength(0)
		})

		it("detects invalid operationIds", async () => {
			const { specs } = await parseOpenApiSpecs(["simple.yaml"], fixturesDir)

			const screens = [
				createScreen("test.screen", ["getUsers", "invalidOperationId"]),
			] as Screen[]

			const result = validateDependsOnReferences(screens, specs)

			expect(result.valid).toBe(false)
			expect(result.errors).toHaveLength(1)
			expect(result.errors[0]?.screenId).toBe("test.screen")
			expect(result.errors[0]?.invalidApi).toBe("invalidOperationId")
		})

		it("supports case-insensitive operationId matching", async () => {
			const { specs } = await parseOpenApiSpecs(["simple.yaml"], fixturesDir)

			const screens = [
				createScreen("test.screen", ["GETUSERS", "getusers"]),
			] as Screen[]

			const result = validateDependsOnReferences(screens, specs)

			expect(result.valid).toBe(true)
			expect(result.errors).toHaveLength(0)
		})
	})

	describe("HTTP format matching", () => {
		it("validates HTTP method + path format", async () => {
			const { specs } = await parseOpenApiSpecs(["simple.yaml"], fixturesDir)

			const screens = [
				createScreen("test.screen", [
					"GET /api/users",
					"POST /api/users",
					"GET /api/users/{id}",
				]),
			] as Screen[]

			const result = validateDependsOnReferences(screens, specs)

			expect(result.valid).toBe(true)
			expect(result.errors).toHaveLength(0)
		})

		it("supports case-insensitive HTTP method", async () => {
			const { specs } = await parseOpenApiSpecs(["simple.yaml"], fixturesDir)

			const screens = [
				createScreen("test.screen", [
					"get /api/users",
					"Get /api/users",
					"GET /api/users",
				]),
			] as Screen[]

			const result = validateDependsOnReferences(screens, specs)

			expect(result.valid).toBe(true)
			expect(result.errors).toHaveLength(0)
		})

		it("detects invalid HTTP endpoints", async () => {
			const { specs } = await parseOpenApiSpecs(["simple.yaml"], fixturesDir)

			const screens = [
				createScreen("test.screen", ["GET /api/nonexistent"]),
			] as Screen[]

			const result = validateDependsOnReferences(screens, specs)

			expect(result.valid).toBe(false)
			expect(result.errors).toHaveLength(1)
			expect(result.errors[0]?.invalidApi).toBe("GET /api/nonexistent")
		})
	})

	describe("mixed format support", () => {
		it("validates mixed operationId and HTTP formats", async () => {
			const { specs } = await parseOpenApiSpecs(["simple.yaml"], fixturesDir)

			const screens = [
				createScreen("test.screen", [
					"getUsers", // operationId
					"GET /api/invoices/{id}", // HTTP format
				]),
			] as Screen[]

			const result = validateDependsOnReferences(screens, specs)

			expect(result.valid).toBe(true)
			expect(result.errors).toHaveLength(0)
		})
	})

	describe("multiple specs", () => {
		it("validates against multiple OpenAPI specs", async () => {
			const { specs } = await parseOpenApiSpecs(
				["simple.yaml", "swagger2.json"],
				fixturesDir,
			)

			const screens = [
				createScreen("test.screen", [
					"getUsers", // from simple.yaml
					"listPayments", // from swagger2.json
				]),
			] as Screen[]

			const result = validateDependsOnReferences(screens, specs)

			expect(result.valid).toBe(true)
			expect(result.errors).toHaveLength(0)
		})
	})

	describe("fuzzy matching suggestions", () => {
		it("provides typo suggestions for invalid operationIds", async () => {
			const { specs } = await parseOpenApiSpecs(["simple.yaml"], fixturesDir)

			const screens = [
				createScreen("test.screen", ["getUsrs"]), // typo for "getUsers"
			] as Screen[]

			const result = validateDependsOnReferences(screens, specs)

			expect(result.valid).toBe(false)
			expect(result.errors).toHaveLength(1)
			expect(result.errors[0]?.suggestion).toBe("getUsers")
		})

		it("provides suggestions for similar HTTP endpoints", async () => {
			const { specs } = await parseOpenApiSpecs(["simple.yaml"], fixturesDir)

			const screens = [
				createScreen("test.screen", ["GET /api/user"]), // missing 's'
			] as Screen[]

			const result = validateDependsOnReferences(screens, specs)

			expect(result.valid).toBe(false)
			expect(result.errors).toHaveLength(1)
			expect(result.errors[0]?.suggestion).toBe("GET /api/users")
		})

		it("does not provide suggestions when no close match exists", async () => {
			const { specs } = await parseOpenApiSpecs(["simple.yaml"], fixturesDir)

			const screens = [
				createScreen("test.screen", ["completelyDifferentApi"]),
			] as Screen[]

			const result = validateDependsOnReferences(screens, specs)

			expect(result.valid).toBe(false)
			expect(result.errors).toHaveLength(1)
			expect(result.errors[0]?.suggestion).toBeUndefined()
		})
	})

	describe("edge cases", () => {
		it("skips screens without dependsOn", async () => {
			const { specs } = await parseOpenApiSpecs(["simple.yaml"], fixturesDir)

			const screens = [createScreen("test.screen", undefined)] as Screen[]

			const result = validateDependsOnReferences(screens, specs)

			expect(result.valid).toBe(true)
			expect(result.errors).toHaveLength(0)
		})

		it("skips screens with empty dependsOn array", async () => {
			const { specs } = await parseOpenApiSpecs(["simple.yaml"], fixturesDir)

			const screens = [createScreen("test.screen", [])] as Screen[]

			const result = validateDependsOnReferences(screens, specs)

			expect(result.valid).toBe(true)
			expect(result.errors).toHaveLength(0)
		})

		it("validates multiple screens at once", async () => {
			const { specs } = await parseOpenApiSpecs(["simple.yaml"], fixturesDir)

			const screens = [
				createScreen("screen1", ["getUsers"]),
				createScreen("screen2", ["invalidApi1"]),
				createScreen("screen3", ["getUserById"]),
				createScreen("screen4", ["invalidApi2"]),
			] as Screen[]

			const result = validateDependsOnReferences(screens, specs)

			expect(result.valid).toBe(false)
			expect(result.errors).toHaveLength(2)
			expect(result.errors.map((e) => e.screenId)).toEqual([
				"screen2",
				"screen4",
			])
		})

		it("handles empty specs array", () => {
			const screens = [createScreen("test.screen", ["someApi"])] as Screen[]

			const result = validateDependsOnReferences(screens, [])

			expect(result.valid).toBe(false)
			expect(result.errors).toHaveLength(1)
		})
	})
})
