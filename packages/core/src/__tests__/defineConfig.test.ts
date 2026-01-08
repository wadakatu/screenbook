import { describe, expect, it } from "vitest"
import { defineConfig } from "../defineScreen.js"

describe("defineConfig", () => {
	it("should return default config when called without arguments", () => {
		const config = defineConfig()

		expect(config).toEqual({
			outDir: ".screenbook",
			metaPattern: "src/**/screen.meta.ts",
			ignore: ["**/node_modules/**", "**/.git/**"],
		})
	})

	it("should override outDir", () => {
		const config = defineConfig({
			outDir: "dist/screenbook",
		})

		expect(config.outDir).toBe("dist/screenbook")
	})

	it("should override metaPattern", () => {
		const config = defineConfig({
			metaPattern: "app/**/*.screen.ts",
		})

		expect(config.metaPattern).toBe("app/**/*.screen.ts")
	})

	it("should set routesPattern for generate/lint commands", () => {
		const config = defineConfig({
			routesPattern: "src/pages/**/*.vue",
		})

		expect(config.routesPattern).toBe("src/pages/**/*.vue")
	})

	it("should set ignore patterns", () => {
		const config = defineConfig({
			ignore: ["**/components/**", "**/layouts/**"],
		})

		expect(config.ignore).toEqual(["**/components/**", "**/layouts/**"])
	})

	it("should allow all options together", () => {
		const config = defineConfig({
			outDir: "build/screenbook",
			metaPattern: "**/meta.ts",
			routesPattern: "app/**/page.tsx",
			ignore: ["app/api/**"],
		})

		expect(config).toEqual({
			outDir: "build/screenbook",
			metaPattern: "**/meta.ts",
			routesPattern: "app/**/page.tsx",
			ignore: ["app/api/**"],
		})
	})

	it("should set routesFile for config-based routing", () => {
		const config = defineConfig({
			routesFile: "src/router/routes.ts",
		})

		expect(config.routesFile).toBe("src/router/routes.ts")
	})

	it("should throw error when both routesPattern and routesFile are set", () => {
		expect(() =>
			defineConfig({
				routesPattern: "src/pages/**/*.vue",
				routesFile: "src/router/routes.ts",
			}),
		).toThrow("Cannot specify both 'routesPattern' and 'routesFile'")
	})

	it("should set lint.orphans to 'warn' by default", () => {
		const config = defineConfig({
			lint: {},
		})

		expect(config.lint?.orphans).toBe("warn")
	})

	it("should allow lint.orphans to be set to 'off'", () => {
		const config = defineConfig({
			lint: { orphans: "off" },
		})

		expect(config.lint?.orphans).toBe("off")
	})

	it("should allow lint.orphans to be set to 'error'", () => {
		const config = defineConfig({
			lint: { orphans: "error" },
		})

		expect(config.lint?.orphans).toBe("error")
	})

	it("should allow lint.orphans to be set to 'warn'", () => {
		const config = defineConfig({
			lint: { orphans: "warn" },
		})

		expect(config.lint?.orphans).toBe("warn")
	})

	it("should allow lint config to be undefined", () => {
		const config = defineConfig()

		expect(config.lint).toBeUndefined()
	})

	it("should reject invalid lint.orphans values", () => {
		expect(() =>
			defineConfig({
				// biome-ignore lint/suspicious/noExplicitAny: Testing invalid enum values
				lint: { orphans: "ignore" as any },
			}),
		).toThrow()
	})

	it("should reject invalid lint.orphans values like 'warning'", () => {
		expect(() =>
			defineConfig({
				// biome-ignore lint/suspicious/noExplicitAny: Testing invalid enum values
				lint: { orphans: "warning" as any },
			}),
		).toThrow()
	})
})
