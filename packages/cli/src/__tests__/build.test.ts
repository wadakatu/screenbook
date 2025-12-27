import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock console.log to suppress output during tests
vi.spyOn(console, "log").mockImplementation(() => {})
vi.spyOn(console, "error").mockImplementation(() => {})

describe("build command", () => {
	const testDir = join(process.cwd(), ".test-build")
	let originalCwd: string

	beforeEach(() => {
		originalCwd = process.cwd()
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true })
		}
		mkdirSync(testDir, { recursive: true })
		process.chdir(testDir)
	})

	afterEach(() => {
		process.chdir(originalCwd)
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true })
		}
		vi.resetModules()
	})

	it("should generate screens.json from screen.meta.ts files", async () => {
		// Create screen directory and file
		const screenDir = join(testDir, "src/screens/home")
		mkdirSync(screenDir, { recursive: true })

		writeFileSync(
			join(screenDir, "screen.meta.ts"),
			`
			export const screen = {
				id: "home",
				title: "Home",
				route: "/",
			}
		`,
		)

		const { buildCommand } = await import("../commands/build.js")

		await buildCommand.run({
			values: { config: undefined, outDir: undefined },
		} as Parameters<typeof buildCommand.run>[0])

		const screensPath = join(testDir, ".screenbook/screens.json")
		expect(existsSync(screensPath)).toBe(true)

		const screens = JSON.parse(readFileSync(screensPath, "utf-8"))
		expect(screens).toHaveLength(1)
		expect(screens[0].id).toBe("home")
	})

	it("should generate graph.mmd file", async () => {
		const screenDir1 = join(testDir, "src/screens/home")
		const screenDir2 = join(testDir, "src/screens/dashboard")
		mkdirSync(screenDir1, { recursive: true })
		mkdirSync(screenDir2, { recursive: true })

		writeFileSync(
			join(screenDir1, "screen.meta.ts"),
			`export const screen = { id: "home", title: "Home", route: "/" }`,
		)

		writeFileSync(
			join(screenDir2, "screen.meta.ts"),
			`export const screen = { id: "dashboard", title: "Dashboard", route: "/dashboard" }`,
		)

		const { buildCommand } = await import("../commands/build.js")

		await buildCommand.run({
			values: { config: undefined, outDir: undefined },
		} as Parameters<typeof buildCommand.run>[0])

		const graphPath = join(testDir, ".screenbook/graph.mmd")
		expect(existsSync(graphPath)).toBe(true)

		const graph = readFileSync(graphPath, "utf-8")
		expect(graph).toContain("flowchart TD")
		expect(graph).toContain('home["Home"]')
		expect(graph).toContain('dashboard["Dashboard"]')
	})

	it("should use custom outDir from command line", async () => {
		const screenDir = join(testDir, "src/screens/home")
		mkdirSync(screenDir, { recursive: true })

		writeFileSync(
			join(screenDir, "screen.meta.ts"),
			`
			export const screen = {
				id: "home",
				title: "Home",
				route: "/",
			}
		`,
		)

		const { buildCommand } = await import("../commands/build.js")

		await buildCommand.run({
			values: { config: undefined, outDir: "custom-output" },
		} as Parameters<typeof buildCommand.run>[0])

		const screensPath = join(testDir, "custom-output/screens.json")
		expect(existsSync(screensPath)).toBe(true)
	})

	it("should handle empty screens directory gracefully", async () => {
		const screenDir = join(testDir, "src/screens")
		mkdirSync(screenDir, { recursive: true })

		const { buildCommand } = await import("../commands/build.js")

		// Should not throw
		await buildCommand.run({
			values: { config: undefined, outDir: undefined },
		} as Parameters<typeof buildCommand.run>[0])

		// screens.json should not be created when no screens found
		const screensPath = join(testDir, ".screenbook/screens.json")
		expect(existsSync(screensPath)).toBe(false)
	})

	it("should sanitize screen IDs with dots in mermaid graph", async () => {
		const screenDir = join(testDir, "src/screens/billing")
		mkdirSync(screenDir, { recursive: true })

		writeFileSync(
			join(screenDir, "screen.meta.ts"),
			`
			export const screen = {
				id: "billing.invoice.detail",
				title: "Invoice Detail",
				route: "/billing/invoices/:id",
			}
		`,
		)

		const { buildCommand } = await import("../commands/build.js")

		await buildCommand.run({
			values: { config: undefined, outDir: undefined },
		} as Parameters<typeof buildCommand.run>[0])

		const graphPath = join(testDir, ".screenbook/graph.mmd")
		const graph = readFileSync(graphPath, "utf-8")

		// Dots should be replaced with underscores in mermaid IDs
		expect(graph).toContain("billing_invoice_detail")
		expect(graph).not.toContain("billing.invoice.detail[")
	})
})
