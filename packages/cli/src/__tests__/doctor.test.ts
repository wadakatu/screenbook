import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
	checkBuildOutput,
	checkConfigFile,
	checkDependencies,
	checkGitRepository,
	checkMetaPattern,
	checkRoutesPattern,
	checkVersionCompatibility,
} from "../commands/doctor.js"

describe("doctor checks", () => {
	const testDir = join(process.cwd(), ".test-doctor")

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

	describe("checkConfigFile", () => {
		it("should pass when config file exists", async () => {
			writeFileSync(join(testDir, "screenbook.config.ts"), "export default {}")

			const result = await checkConfigFile(testDir)

			expect(result.status).toBe("pass")
			expect(result.message).toContain("screenbook.config.ts")
		})

		it("should warn when no config file exists", async () => {
			const result = await checkConfigFile(testDir)

			expect(result.status).toBe("warn")
			expect(result.suggestion).toContain("screenbook init")
		})

		it("should find .js config file", async () => {
			writeFileSync(join(testDir, "screenbook.config.js"), "export default {}")

			const result = await checkConfigFile(testDir)

			expect(result.status).toBe("pass")
			expect(result.message).toContain("screenbook.config.js")
		})
	})

	describe("checkDependencies", () => {
		it("should fail when package.json not found", async () => {
			const result = await checkDependencies(testDir)

			expect(result.status).toBe("fail")
			expect(result.message).toContain("package.json not found")
		})

		it("should fail when screenbook packages not installed", async () => {
			writeFileSync(
				join(testDir, "package.json"),
				JSON.stringify({ dependencies: {} }),
			)

			const result = await checkDependencies(testDir)

			expect(result.status).toBe("fail")
			expect(result.message).toContain("not installed")
		})

		it("should pass when both packages are installed", async () => {
			writeFileSync(
				join(testDir, "package.json"),
				JSON.stringify({
					devDependencies: {
						"@screenbook/core": "^0.1.0",
						"@screenbook/cli": "^0.1.0",
					},
				}),
			)

			const result = await checkDependencies(testDir)

			expect(result.status).toBe("pass")
			expect(result.message).toContain("@screenbook/core")
			expect(result.message).toContain("@screenbook/cli")
		})

		it("should warn when only core is installed", async () => {
			writeFileSync(
				join(testDir, "package.json"),
				JSON.stringify({
					devDependencies: {
						"@screenbook/core": "^0.1.0",
					},
				}),
			)

			const result = await checkDependencies(testDir)

			expect(result.status).toBe("warn")
			expect(result.message).toContain("@screenbook/cli not found")
		})
	})

	describe("checkMetaPattern", () => {
		it("should pass when matching files found", async () => {
			const srcDir = join(testDir, "src", "screens")
			mkdirSync(srcDir, { recursive: true })
			writeFileSync(join(srcDir, "screen.meta.ts"), "export const screen = {}")

			const result = await checkMetaPattern(
				testDir,
				"src/**/screen.meta.ts",
				[],
			)

			expect(result.status).toBe("pass")
			expect(result.message).toContain("1 screen.meta.ts file")
		})

		it("should warn when no files match", async () => {
			const result = await checkMetaPattern(
				testDir,
				"src/**/screen.meta.ts",
				[],
			)

			expect(result.status).toBe("warn")
			expect(result.suggestion).toContain("screenbook generate")
		})
	})

	describe("checkRoutesPattern", () => {
		it("should warn when pattern not configured", async () => {
			const result = await checkRoutesPattern(testDir, undefined, [])

			expect(result.status).toBe("warn")
			expect(result.message).toContain("not configured")
		})

		it("should pass when matching files found", async () => {
			const pagesDir = join(testDir, "src", "pages")
			mkdirSync(pagesDir, { recursive: true })
			writeFileSync(join(pagesDir, "index.tsx"), "export default () => {}")

			const result = await checkRoutesPattern(testDir, "src/pages/**/*.tsx", [])

			expect(result.status).toBe("pass")
			expect(result.message).toContain("1 route file")
		})
	})

	describe("checkBuildOutput", () => {
		it("should fail when screens.json not found", async () => {
			const result = await checkBuildOutput(testDir, ".screenbook")

			expect(result.status).toBe("fail")
			expect(result.suggestion).toContain("screenbook build")
		})

		it("should pass when screens.json exists and valid", async () => {
			const outDir = join(testDir, ".screenbook")
			mkdirSync(outDir, { recursive: true })
			writeFileSync(
				join(outDir, "screens.json"),
				JSON.stringify([{ id: "home" }, { id: "about" }]),
			)

			const result = await checkBuildOutput(testDir, ".screenbook")

			expect(result.status).toBe("pass")
			expect(result.message).toContain("2 screens")
		})

		it("should fail when screens.json is corrupted", async () => {
			const outDir = join(testDir, ".screenbook")
			mkdirSync(outDir, { recursive: true })
			writeFileSync(join(outDir, "screens.json"), "not valid json")

			const result = await checkBuildOutput(testDir, ".screenbook")

			expect(result.status).toBe("fail")
			expect(result.message).toContain("corrupted")
		})
	})

	describe("checkVersionCompatibility", () => {
		it("should warn when package.json not found", async () => {
			const result = await checkVersionCompatibility(testDir)

			expect(result.status).toBe("warn")
		})

		it("should pass when versions are compatible", async () => {
			writeFileSync(
				join(testDir, "package.json"),
				JSON.stringify({
					devDependencies: {
						"@screenbook/core": "^0.1.0",
						"@screenbook/cli": "^0.1.2",
					},
				}),
			)

			const result = await checkVersionCompatibility(testDir)

			expect(result.status).toBe("pass")
		})

		it("should warn when major versions differ", async () => {
			writeFileSync(
				join(testDir, "package.json"),
				JSON.stringify({
					devDependencies: {
						"@screenbook/core": "^1.0.0",
						"@screenbook/cli": "^2.0.0",
					},
				}),
			)

			const result = await checkVersionCompatibility(testDir)

			expect(result.status).toBe("warn")
			expect(result.message).toContain("mismatch")
		})
	})

	describe("checkGitRepository", () => {
		it("should pass when .git directory exists", async () => {
			mkdirSync(join(testDir, ".git"), { recursive: true })

			const result = await checkGitRepository(testDir)

			expect(result.status).toBe("pass")
		})

		it("should warn when not a git repository", async () => {
			const result = await checkGitRepository(testDir)

			expect(result.status).toBe("warn")
			expect(result.suggestion).toContain("git init")
		})
	})
})
