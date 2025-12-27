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
})
