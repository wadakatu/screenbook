import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	cleanupTempDir,
	copyFixture,
	createTempProjectDir,
} from "./helpers/fixtures.js"

// Mock console to suppress output during tests
vi.spyOn(console, "log").mockImplementation(() => {})
vi.spyOn(console, "error").mockImplementation(() => {})

// Mock process.exit to prevent test termination
const mockExit = vi.spyOn(process, "exit").mockImplementation((code) => {
	throw new Error(`Process exited with code ${code}`)
})

describe("E2E: Progressive Adoption", () => {
	let testDir: string
	let originalCwd: string

	beforeEach(() => {
		originalCwd = process.cwd()
		testDir = createTempProjectDir()
		copyFixture("nextjs-partial", testDir)
		process.chdir(testDir)
		mockExit.mockClear()
	})

	afterEach(() => {
		process.chdir(originalCwd)
		cleanupTempDir(testDir)
		vi.resetModules()
	})

	describe("minimumCoverage setting", () => {
		it("should pass lint with 50% coverage when minimumCoverage is 50", async () => {
			// nextjs-partial has 1/2 routes covered (50%)
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default {
	metaPattern: "app/**/screen.meta.ts",
	routesPattern: "app/**/page.tsx",
	outDir: ".screenbook",
	ignore: [],
	adoption: {
		mode: "progressive",
		minimumCoverage: 50,
	},
}
`,
			)

			const { lintCommand } = await import("../../commands/lint.js")

			// Should pass (1/2 = 50% coverage)
			await lintCommand.run({
				values: { config: undefined },
			} as Parameters<typeof lintCommand.run>[0])

			expect(mockExit).not.toHaveBeenCalled()
		})

		it("should fail lint with 50% coverage when minimumCoverage is 80", async () => {
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default {
	metaPattern: "app/**/screen.meta.ts",
	routesPattern: "app/**/page.tsx",
	outDir: ".screenbook",
	ignore: [],
	adoption: {
		mode: "progressive",
		minimumCoverage: 80,
	},
}
`,
			)

			const { lintCommand } = await import("../../commands/lint.js")

			// Should fail (50% < 80%)
			await expect(
				lintCommand.run({
					values: { config: undefined },
				} as Parameters<typeof lintCommand.run>[0]),
			).rejects.toThrow("Process exited with code 1")
		})

		it("should fail lint with 50% coverage when minimumCoverage defaults to 100", async () => {
			// Without adoption config, default is mode: "full" with 100% minimum
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default {
	metaPattern: "app/**/screen.meta.ts",
	routesPattern: "app/**/page.tsx",
	outDir: ".screenbook",
	ignore: [],
}
`,
			)

			const { lintCommand } = await import("../../commands/lint.js")

			// Should fail (50% < 100%)
			await expect(
				lintCommand.run({
					values: { config: undefined },
				} as Parameters<typeof lintCommand.run>[0]),
			).rejects.toThrow("Process exited with code 1")
		})
	})

	describe("includePatterns setting", () => {
		it("should only check coverage within includePatterns", async () => {
			// Add more pages to test includePatterns
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default {
	metaPattern: "app/**/screen.meta.ts",
	routesPattern: "app/**/page.tsx",
	outDir: ".screenbook",
	ignore: [],
	adoption: {
		mode: "progressive",
		includePatterns: ["app/page.tsx"],
		minimumCoverage: 100,
	},
}
`,
			)

			const { lintCommand } = await import("../../commands/lint.js")

			// Should pass because only app/page.tsx is checked and it has screen.meta.ts
			await lintCommand.run({
				values: { config: undefined },
			} as Parameters<typeof lintCommand.run>[0])

			expect(mockExit).not.toHaveBeenCalled()
		})

		it("should fail when includePatterns scope is not covered", async () => {
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default {
	metaPattern: "app/**/screen.meta.ts",
	routesPattern: "app/**/page.tsx",
	outDir: ".screenbook",
	ignore: [],
	adoption: {
		mode: "progressive",
		includePatterns: ["app/settings/**"],
		minimumCoverage: 100,
	},
}
`,
			)

			const { lintCommand } = await import("../../commands/lint.js")

			// Should fail because settings/page.tsx is in scope but has no screen.meta.ts
			await expect(
				lintCommand.run({
					values: { config: undefined },
				} as Parameters<typeof lintCommand.run>[0]),
			).rejects.toThrow("Process exited with code 1")
		})
	})

	describe("gradual coverage increase", () => {
		it("should allow gradual coverage increase by updating minimumCoverage", async () => {
			// Start with 0% minimum (no enforcement)
			writeFileSync(
				join(testDir, "screenbook.config.ts"),
				`export default {
	metaPattern: "app/**/screen.meta.ts",
	routesPattern: "app/**/page.tsx",
	outDir: ".screenbook",
	ignore: [],
	adoption: {
		mode: "progressive",
		minimumCoverage: 0,
	},
}
`,
			)

			const { lintCommand } = await import("../../commands/lint.js")

			// Should pass with any coverage
			await lintCommand.run({
				values: { config: undefined },
			} as Parameters<typeof lintCommand.run>[0])

			expect(mockExit).not.toHaveBeenCalled()
		})
	})
})
