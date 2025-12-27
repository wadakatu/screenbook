import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { loadConfig } from "../utils/config.js"

describe("loadConfig", () => {
	const testDir = join(process.cwd(), ".test-config")

	beforeEach(() => {
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true })
		}
		mkdirSync(testDir, { recursive: true })
	})

	afterEach(() => {
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true })
		}
	})

	it("should return default config when no config file exists", async () => {
		const originalCwd = process.cwd()
		process.chdir(testDir)

		try {
			const config = await loadConfig()

			expect(config.outDir).toBe(".screenbook")
			expect(config.metaPattern).toBe("src/**/screen.meta.ts")
		} finally {
			process.chdir(originalCwd)
		}
	})

	it("should throw error when specified config file does not exist", async () => {
		await expect(loadConfig("nonexistent.config.ts")).rejects.toThrow(
			"Config file not found",
		)
	})

	it("should load config from screenbook.config.ts", async () => {
		const originalCwd = process.cwd()
		const configPath = join(testDir, "screenbook.config.ts")

		writeFileSync(
			configPath,
			`
			import { defineConfig } from "@screenbook/core"
			export default defineConfig({
				metaPattern: "custom/**/*.screen.ts",
				outDir: "custom/output",
			})
		`,
		)

		process.chdir(testDir)

		try {
			const config = await loadConfig()

			expect(config.metaPattern).toBe("custom/**/*.screen.ts")
			expect(config.outDir).toBe("custom/output")
		} finally {
			process.chdir(originalCwd)
		}
	})

	it("should load config from specified path", async () => {
		const configPath = join(testDir, "custom.config.ts")

		writeFileSync(
			configPath,
			`
			import { defineConfig } from "@screenbook/core"
			export default defineConfig({
				metaPattern: "app/**/screen.meta.ts",
			})
		`,
		)

		const config = await loadConfig(configPath)

		expect(config.metaPattern).toBe("app/**/screen.meta.ts")
	})
})
