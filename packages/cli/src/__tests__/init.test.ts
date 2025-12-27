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

describe("init command", () => {
	const testDir = join(process.cwd(), ".test-init")
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
	})

	it("should create screenbook.config.ts", async () => {
		const { initCommand } = await import("../commands/init.js")

		await initCommand.run({
			values: { force: false, skipDetect: true },
		} as Parameters<typeof initCommand.run>[0])

		const configPath = join(testDir, "screenbook.config.ts")
		expect(existsSync(configPath)).toBe(true)

		const content = readFileSync(configPath, "utf-8")
		expect(content).toContain("defineConfig")
		expect(content).toContain("metaPattern")
	})

	it("should create .gitignore with .screenbook", async () => {
		const { initCommand } = await import("../commands/init.js")

		await initCommand.run({
			values: { force: false, skipDetect: true },
		} as Parameters<typeof initCommand.run>[0])

		const gitignorePath = join(testDir, ".gitignore")
		expect(existsSync(gitignorePath)).toBe(true)

		const content = readFileSync(gitignorePath, "utf-8")
		expect(content).toContain(".screenbook")
	})

	it("should append to existing .gitignore", async () => {
		const gitignorePath = join(testDir, ".gitignore")
		writeFileSync(gitignorePath, "node_modules\ndist\n")

		const { initCommand } = await import("../commands/init.js")

		await initCommand.run({
			values: { force: false, skipDetect: true },
		} as Parameters<typeof initCommand.run>[0])

		const content = readFileSync(gitignorePath, "utf-8")
		expect(content).toContain("node_modules")
		expect(content).toContain("dist")
		expect(content).toContain(".screenbook")
	})

	it("should not duplicate .screenbook in .gitignore", async () => {
		const gitignorePath = join(testDir, ".gitignore")
		writeFileSync(gitignorePath, "node_modules\n.screenbook\n")

		const { initCommand } = await import("../commands/init.js")

		await initCommand.run({
			values: { force: false, skipDetect: true },
		} as Parameters<typeof initCommand.run>[0])

		const content = readFileSync(gitignorePath, "utf-8")
		const matches = content.match(/\.screenbook/g)
		expect(matches).toHaveLength(1)
	})

	it("should skip existing files without force flag", async () => {
		const configPath = join(testDir, "screenbook.config.ts")
		writeFileSync(configPath, "// existing config")

		const { initCommand } = await import("../commands/init.js")

		await initCommand.run({
			values: { force: false, skipDetect: true },
		} as Parameters<typeof initCommand.run>[0])

		const content = readFileSync(configPath, "utf-8")
		expect(content).toBe("// existing config")
	})

	it("should overwrite existing files with force flag", async () => {
		const configPath = join(testDir, "screenbook.config.ts")
		writeFileSync(configPath, "// existing config")

		const { initCommand } = await import("../commands/init.js")

		await initCommand.run({
			values: { force: true, skipDetect: true },
		} as Parameters<typeof initCommand.run>[0])

		const content = readFileSync(configPath, "utf-8")
		expect(content).toContain("defineConfig")
		expect(content).not.toBe("// existing config")
	})
})
