import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs"
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

	it("should generate coverage.json with correct missing routes", async () => {
		// Create config with routesPattern
		writeFileSync(
			join(testDir, "screenbook.config.ts"),
			`
			export default {
				metaPattern: "src/pages/**/screen.meta.ts",
				routesPattern: "src/pages/**/index.vue",
				outDir: ".screenbook",
				ignore: ["node_modules/**"],
			}
		`,
		)

		// Create 3 route files
		const homeDir = join(testDir, "src/pages/home")
		const aboutDir = join(testDir, "src/pages/about")
		const contactDir = join(testDir, "src/pages/contact")

		mkdirSync(homeDir, { recursive: true })
		mkdirSync(aboutDir, { recursive: true })
		mkdirSync(contactDir, { recursive: true })

		writeFileSync(join(homeDir, "index.vue"), "<template>Home</template>")
		writeFileSync(join(aboutDir, "index.vue"), "<template>About</template>")
		writeFileSync(join(contactDir, "index.vue"), "<template>Contact</template>")

		// Create screen.meta.ts only for home (1 of 3 routes documented)
		writeFileSync(
			join(homeDir, "screen.meta.ts"),
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
			values: { config: "screenbook.config.ts", outDir: undefined },
		} as Parameters<typeof buildCommand.run>[0])

		const coveragePath = join(testDir, ".screenbook/coverage.json")
		expect(existsSync(coveragePath)).toBe(true)

		const coverage = JSON.parse(readFileSync(coveragePath, "utf-8"))

		// Should have 3 total routes, 1 covered, 2 missing
		expect(coverage.total).toBe(3)
		expect(coverage.covered).toBe(1)
		expect(coverage.percentage).toBe(33)

		// Missing should contain 2 routes (about and contact)
		expect(coverage.missing).toHaveLength(2)

		const missingRoutes = coverage.missing.map(
			(m: { route: string }) => m.route,
		)
		expect(missingRoutes).toContain("src/pages/about/index.vue")
		expect(missingRoutes).toContain("src/pages/contact/index.vue")
		expect(missingRoutes).not.toContain("src/pages/home/index.vue")
	})

	it("should count coverage correctly when multiple routes share one screen.meta.ts (issue #174)", async () => {
		// This test reproduces issue #174: coverage calculation inconsistency
		// When multiple route files exist in the same directory with one screen.meta.ts,
		// the coverage should count route files, not screen files

		// Use unique config filename to avoid jiti cache issues
		const configFile = "screenbook-issue174.config.ts"
		writeFileSync(
			join(testDir, configFile),
			`
			export default {
				metaPattern: "src/pages/**/screen.meta.ts",
				routesPattern: "src/pages/**/*.vue",
				outDir: ".screenbook",
				ignore: ["node_modules/**"],
			}
		`,
		)

		// Create directory with multiple route files and one screen.meta.ts
		const usersDir = join(testDir, "src/pages/users")
		const productsDir = join(testDir, "src/pages/products")

		mkdirSync(usersDir, { recursive: true })
		mkdirSync(productsDir, { recursive: true })

		// Users directory: 3 route files, 1 screen.meta.ts
		writeFileSync(join(usersDir, "index.vue"), "<template>Users</template>")
		writeFileSync(
			join(usersDir, "detail.vue"),
			"<template>User Detail</template>",
		)
		writeFileSync(
			join(usersDir, "create.vue"),
			"<template>Create User</template>",
		)
		writeFileSync(
			join(usersDir, "screen.meta.ts"),
			`export const screen = { id: "users", title: "Users", route: "/users" }`,
		)

		// Products directory: 2 route files, no screen.meta.ts
		writeFileSync(
			join(productsDir, "index.vue"),
			"<template>Products</template>",
		)
		writeFileSync(
			join(productsDir, "detail.vue"),
			"<template>Product Detail</template>",
		)

		const { buildCommand } = await import("../commands/build.js")

		await buildCommand.run({
			values: { config: configFile, outDir: undefined },
		} as Parameters<typeof buildCommand.run>[0])

		const coveragePath = join(testDir, ".screenbook/coverage.json")
		const coverage = JSON.parse(readFileSync(coveragePath, "utf-8"))

		// Total: 5 route files (3 in users, 2 in products)
		expect(coverage.total).toBe(5)

		// Covered: 3 route files in users directory (which has screen.meta.ts)
		// NOT 1 (the number of screen.meta.ts files)
		expect(coverage.covered).toBe(3)

		// Missing: 2 route files in products directory
		expect(coverage.missing).toHaveLength(2)
		expect(coverage.percentage).toBe(60)
	})

	it("should exclude components subdirectory from coverage calculation (issue #203)", async () => {
		// This test reproduces issue #203:
		// When routesPattern is "src/pages/**/*.vue", files in components/ subdirectories
		// should be excluded from coverage calculation by default

		const configFile = "screenbook-issue203.config.ts"
		writeFileSync(
			join(testDir, configFile),
			`
			export default {
				metaPattern: "src/pages/**/screen.meta.ts",
				routesPattern: "src/pages/**/*.vue",
				outDir: ".screenbook",
				ignore: ["node_modules/**"],
			}
		`,
		)

		// Create page directories
		const projectsDir = join(testDir, "src/pages/PageProjects")
		const componentsDir = join(testDir, "src/pages/PageProjects/components")

		mkdirSync(projectsDir, { recursive: true })
		mkdirSync(componentsDir, { recursive: true })

		// Actual route component
		writeFileSync(
			join(projectsDir, "PageProjects.vue"),
			"<template>Projects</template>",
		)
		writeFileSync(
			join(projectsDir, "screen.meta.ts"),
			`export const screen = { id: "projects", title: "Projects", route: "/projects" }`,
		)

		// Component files (NOT routes, should be excluded)
		writeFileSync(
			join(componentsDir, "ProjectCard.vue"),
			"<template>Card</template>",
		)
		writeFileSync(
			join(componentsDir, "EditProjectDialog.vue"),
			"<template>Dialog</template>",
		)

		const { buildCommand } = await import("../commands/build.js")

		await buildCommand.run({
			values: { config: configFile, outDir: undefined },
		} as Parameters<typeof buildCommand.run>[0])

		const coveragePath = join(testDir, ".screenbook/coverage.json")
		const coverage = JSON.parse(readFileSync(coveragePath, "utf-8"))

		// Should only count the actual route file (PageProjects.vue)
		// NOT the component files in components/ subdirectory
		expect(coverage.total).toBe(1)
		expect(coverage.covered).toBe(1)
		expect(coverage.percentage).toBe(100)
		expect(coverage.missing).toHaveLength(0)
	})

	it("should use custom excludePatterns from config", async () => {
		// Test that custom excludePatterns override default patterns
		// When excludePatterns is set, only those patterns are excluded (not DEFAULT_EXCLUDE_PATTERNS)

		const configFile = "screenbook-custom-exclude.config.ts"
		writeFileSync(
			join(testDir, configFile),
			`
			export default {
				metaPattern: "src/pages/**/screen.meta.ts",
				routesPattern: "src/pages/**/*.vue",
				outDir: ".screenbook",
				ignore: ["node_modules/**"],
				excludePatterns: ["**/internal/**"],
			}
		`,
		)

		// Create page directories
		const homeDir = join(testDir, "src/pages/home")
		const componentsDir = join(testDir, "src/pages/home/components")
		const internalDir = join(testDir, "src/pages/home/internal")

		mkdirSync(homeDir, { recursive: true })
		mkdirSync(componentsDir, { recursive: true })
		mkdirSync(internalDir, { recursive: true })

		// Route file with screen.meta.ts
		writeFileSync(join(homeDir, "Home.vue"), "<template>Home</template>")
		writeFileSync(
			join(homeDir, "screen.meta.ts"),
			`export const screen = { id: "home", title: "Home", route: "/" }`,
		)

		// Components directory with screen.meta.ts (would be excluded by default, but not with custom pattern)
		writeFileSync(
			join(componentsDir, "Widget.vue"),
			"<template>Widget</template>",
		)
		writeFileSync(
			join(componentsDir, "screen.meta.ts"),
			`export const screen = { id: "widget", title: "Widget", route: "/widget" }`,
		)

		// Internal - excluded with custom pattern
		writeFileSync(
			join(internalDir, "Helper.vue"),
			"<template>Helper</template>",
		)

		const { buildCommand } = await import("../commands/build.js")

		await buildCommand.run({
			values: { config: configFile, outDir: undefined },
		} as Parameters<typeof buildCommand.run>[0])

		const coveragePath = join(testDir, ".screenbook/coverage.json")
		const coverage = JSON.parse(readFileSync(coveragePath, "utf-8"))

		// With custom excludePatterns: ["**/internal/**"]
		// - Home.vue: counted (route)
		// - Widget.vue: counted (components/ not excluded by custom pattern)
		// - Helper.vue: NOT counted (excluded by custom pattern)
		expect(coverage.total).toBe(2)
		expect(coverage.covered).toBe(2) // Both dirs have screen.meta.ts
		expect(coverage.percentage).toBe(100)
	})
})
