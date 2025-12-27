import { describe, expect, it } from "vitest"
import { defineConfig } from "../defineScreen.js"

describe("defineConfig", () => {
	it("should return default config when called without arguments", () => {
		const config = defineConfig()

		expect(config).toEqual({
			screensDir: "src/screens",
			outDir: ".screenbook",
			metaPattern: "**/screen.meta.ts",
			lintIgnore: [],
		})
	})

	it("should override screensDir", () => {
		const config = defineConfig({
			screensDir: "src/pages",
		})

		expect(config.screensDir).toBe("src/pages")
		expect(config.outDir).toBe(".screenbook")
		expect(config.metaPattern).toBe("**/screen.meta.ts")
	})

	it("should override outDir", () => {
		const config = defineConfig({
			outDir: "dist/screenbook",
		})

		expect(config.outDir).toBe("dist/screenbook")
	})

	it("should override metaPattern", () => {
		const config = defineConfig({
			metaPattern: "**/*.screen.ts",
		})

		expect(config.metaPattern).toBe("**/*.screen.ts")
	})

	it("should set routesPattern for lint command", () => {
		const config = defineConfig({
			routesPattern: "src/pages/**/*.vue",
		})

		expect(config.routesPattern).toBe("src/pages/**/*.vue")
	})

	it("should set lintIgnore patterns", () => {
		const config = defineConfig({
			lintIgnore: ["**/components/**", "**/layouts/**"],
		})

		expect(config.lintIgnore).toEqual(["**/components/**", "**/layouts/**"])
	})

	it("should allow all options together", () => {
		const config = defineConfig({
			screensDir: "app/screens",
			outDir: "build/screenbook",
			metaPattern: "**/meta.ts",
			routesPattern: "app/**/page.tsx",
			lintIgnore: ["app/api/**"],
		})

		expect(config).toEqual({
			screensDir: "app/screens",
			outDir: "build/screenbook",
			metaPattern: "**/meta.ts",
			routesPattern: "app/**/page.tsx",
			lintIgnore: ["app/api/**"],
		})
	})
})
