import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov", "json-summary"],
			reportsDirectory: "./coverage",
			include: ["packages/cli/src/**/*.ts", "packages/core/src/**/*.ts"],
			exclude: [
				"**/*.test.ts",
				"**/*.spec.ts",
				"**/*.d.ts",
				"**/index.ts",
				"**/__tests__/**",
				// CLI orchestration - spawns processes, interactive prompts
				// Testable logic extracted and tested separately
				"**/commands/dev.ts",
				"**/commands/init.ts",
				"**/commands/impact.ts",
				"**/commands/pr-impact.ts",
			],
		},
	},
})
