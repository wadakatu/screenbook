import { describe, expect, it } from "vitest"
import {
	analyzeApiImports,
	mergeDependsOn,
} from "../utils/apiImportAnalyzer.js"

describe("analyzeApiImports", () => {
	it("should detect named imports from configured package", () => {
		const content = `
import { getUsers, createUser } from "@api/client"

export function UserList() {
  const users = getUsers()
  return <div>{users.map(u => u.name)}</div>
}
`
		const result = analyzeApiImports(content, {
			clientPackages: ["@api/client"],
		})

		expect(result.imports).toHaveLength(2)
		expect(result.imports[0]).toEqual({
			importName: "getUsers",
			packageName: "@api/client",
			dependsOnName: "@api/client/getUsers",
			line: 2,
		})
		expect(result.imports[1]).toEqual({
			importName: "createUser",
			packageName: "@api/client",
			dependsOnName: "@api/client/createUser",
			line: 2,
		})
		expect(result.warnings).toHaveLength(0)
	})

	it("should detect imports from multiple configured packages", () => {
		const content = `
import { getUsers } from "@api/users"
import { getProducts } from "@api/products"
import { unrelated } from "other-lib"
`
		const result = analyzeApiImports(content, {
			clientPackages: ["@api/users", "@api/products"],
		})

		expect(result.imports).toHaveLength(2)
		expect(result.imports.map((i) => i.dependsOnName)).toEqual([
			"@api/users/getUsers",
			"@api/products/getProducts",
		])
	})

	it("should ignore imports from non-configured packages", () => {
		const content = `
import { useState } from "react"
import { getUsers } from "@api/client"
import axios from "axios"
`
		const result = analyzeApiImports(content, {
			clientPackages: ["@api/client"],
		})

		expect(result.imports).toHaveLength(1)
		expect(result.imports.at(0)?.importName).toBe("getUsers")
	})

	it("should skip type-only imports", () => {
		const content = `
import type { User } from "@api/client"
import { getUsers } from "@api/client"
`
		const result = analyzeApiImports(content, {
			clientPackages: ["@api/client"],
		})

		expect(result.imports).toHaveLength(1)
		expect(result.imports.at(0)?.importName).toBe("getUsers")
	})

	it("should skip type-only specifiers within regular import", () => {
		const content = `
import { type User, getUsers, type Product } from "@api/client"
`
		const result = analyzeApiImports(content, {
			clientPackages: ["@api/client"],
		})

		expect(result.imports).toHaveLength(1)
		expect(result.imports.at(0)?.importName).toBe("getUsers")
	})

	it("should apply extractApiName transform", () => {
		const content = `
import { useGetUsers, useCreateUser } from "@api/client"
`
		const result = analyzeApiImports(content, {
			clientPackages: ["@api/client"],
			extractApiName: (name) => name.replace(/^use/, ""),
		})

		expect(result.imports).toHaveLength(2)
		expect(result.imports.at(0)?.dependsOnName).toBe("@api/client/GetUsers")
		expect(result.imports.at(1)?.dependsOnName).toBe("@api/client/CreateUser")
	})

	it("should warn on default imports", () => {
		const content = `
import api from "@api/client"
`
		const result = analyzeApiImports(content, {
			clientPackages: ["@api/client"],
		})

		expect(result.imports).toHaveLength(0)
		expect(result.warnings).toHaveLength(1)
		expect(result.warnings[0]).toContain("Default import")
		expect(result.warnings[0]).toContain("cannot be statically analyzed")
	})

	it("should warn on namespace imports", () => {
		const content = `
import * as api from "@api/client"
`
		const result = analyzeApiImports(content, {
			clientPackages: ["@api/client"],
		})

		expect(result.imports).toHaveLength(0)
		expect(result.warnings).toHaveLength(1)
		expect(result.warnings[0]).toContain("Namespace import")
		expect(result.warnings[0]).toContain("cannot be statically analyzed")
	})

	it("should handle syntax errors gracefully", () => {
		const content = `
import { getUsers from "@api/client"  // missing closing brace
`
		const result = analyzeApiImports(content, {
			clientPackages: ["@api/client"],
		})

		expect(result.imports).toHaveLength(0)
		expect(result.warnings).toHaveLength(1)
		expect(result.warnings[0]).toContain("Syntax error")
	})

	it("should handle non-SyntaxError parse failures gracefully", () => {
		// Babel may throw different error types for different issues
		// Test with severely malformed content that might cause unexpected errors
		const content = "\x00\x01\x02"
		const result = analyzeApiImports(content, {
			clientPackages: ["@api/client"],
		})

		// Should not throw, should return empty imports
		expect(result.imports).toHaveLength(0)
		// May or may not have warnings depending on how Babel handles this
		// The important thing is it doesn't throw
	})

	it("should return empty result for file with no imports", () => {
		const content = `
export function hello() {
  return "world"
}
`
		const result = analyzeApiImports(content, {
			clientPackages: ["@api/client"],
		})

		expect(result.imports).toHaveLength(0)
		expect(result.warnings).toHaveLength(0)
	})

	it("should match subpath imports", () => {
		const content = `
import { getUser } from "@api/client/users"
import { getProduct } from "@api/client/products"
`
		const result = analyzeApiImports(content, {
			clientPackages: ["@api/client"],
		})

		expect(result.imports).toHaveLength(2)
		expect(result.imports.at(0)?.packageName).toBe("@api/client/users")
		expect(result.imports.at(0)?.dependsOnName).toBe(
			"@api/client/users/getUser",
		)
	})

	it("should handle aliased imports", () => {
		const content = `
import { getUsers as fetchUsers } from "@api/client"
`
		const result = analyzeApiImports(content, {
			clientPackages: ["@api/client"],
		})

		expect(result.imports).toHaveLength(1)
		// Should use the original imported name, not the alias
		expect(result.imports.at(0)?.importName).toBe("getUsers")
		expect(result.imports.at(0)?.dependsOnName).toBe("@api/client/getUsers")
	})

	it("should handle JSX files", () => {
		const content = `
import { getUsers } from "@api/client"

export function UserList() {
  return <div className="users">{getUsers().map(u => <span key={u.id}>{u.name}</span>)}</div>
}
`
		const result = analyzeApiImports(content, {
			clientPackages: ["@api/client"],
		})

		expect(result.imports).toHaveLength(1)
		expect(result.imports.at(0)?.importName).toBe("getUsers")
	})
})

describe("mergeDependsOn", () => {
	it("should merge existing and detected dependencies", () => {
		const existing = ["ManualAPI.endpoint1", "ManualAPI.endpoint2"]
		const detected = [
			{
				importName: "getUsers",
				packageName: "@api/client",
				dependsOnName: "@api/client/getUsers",
				line: 1,
			},
		]

		const result = mergeDependsOn(existing, detected)

		expect(result).toEqual([
			"@api/client/getUsers",
			"ManualAPI.endpoint1",
			"ManualAPI.endpoint2",
		])
	})

	it("should remove duplicates", () => {
		const existing = ["@api/client/getUsers", "ManualAPI.endpoint"]
		const detected = [
			{
				importName: "getUsers",
				packageName: "@api/client",
				dependsOnName: "@api/client/getUsers",
				line: 1,
			},
		]

		const result = mergeDependsOn(existing, detected)

		expect(result).toEqual(["@api/client/getUsers", "ManualAPI.endpoint"])
	})

	it("should return sorted array", () => {
		const existing = ["z-api", "a-api"]
		const detected = [
			{
				importName: "middle",
				packageName: "@api",
				dependsOnName: "m-api",
				line: 1,
			},
		]

		const result = mergeDependsOn(existing, detected)

		expect(result).toEqual(["a-api", "m-api", "z-api"])
	})

	it("should handle empty existing array", () => {
		const existing: string[] = []
		const detected = [
			{
				importName: "getUsers",
				packageName: "@api/client",
				dependsOnName: "@api/client/getUsers",
				line: 1,
			},
		]

		const result = mergeDependsOn(existing, detected)

		expect(result).toEqual(["@api/client/getUsers"])
	})

	it("should handle empty detected array", () => {
		const existing = ["ManualAPI.endpoint"]
		const detected: never[] = []

		const result = mergeDependsOn(existing, detected)

		expect(result).toEqual(["ManualAPI.endpoint"])
	})
})
