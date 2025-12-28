import { cpSync, mkdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

/**
 * Create a unique temporary project directory for E2E tests.
 */
export function createTempProjectDir(): string {
	const tempDir = join(
		tmpdir(),
		`screenbook-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`,
	)
	mkdirSync(tempDir, { recursive: true })
	return tempDir
}

/**
 * Copy a fixture to the target directory.
 */
export function copyFixture(fixtureName: string, targetDir: string): void {
	const fixtureDir = join(__dirname, "../fixtures", fixtureName)
	cpSync(fixtureDir, targetDir, { recursive: true })
}

/**
 * Clean up a temporary E2E test directory.
 * Only removes directories that match the screenbook-e2e pattern for safety.
 */
export function cleanupTempDir(dir: string): void {
	if (dir.includes("screenbook-e2e-")) {
		rmSync(dir, { recursive: true, force: true })
	}
}
