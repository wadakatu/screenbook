import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { isInteractive } from "../utils/isInteractive.js"

describe("isInteractive", () => {
	const originalEnv = { ...process.env }

	beforeEach(() => {
		// Clear CI-related env vars
		delete process.env.CI
		delete process.env.CONTINUOUS_INTEGRATION
		delete process.env.GITHUB_ACTIONS
		delete process.env.GITLAB_CI
		delete process.env.JENKINS_URL
	})

	afterEach(() => {
		// Restore original environment
		process.env = { ...originalEnv }
	})

	it("should return false when CI=true", () => {
		process.env.CI = "true"
		expect(isInteractive()).toBe(false)
	})

	it("should return false when CI=1 (alternative CI value)", () => {
		process.env.CI = "1"
		expect(isInteractive()).toBe(false)
	})

	it("should return false when CONTINUOUS_INTEGRATION is set", () => {
		process.env.CONTINUOUS_INTEGRATION = "true"
		expect(isInteractive()).toBe(false)
	})

	it("should return false when GITHUB_ACTIONS is set", () => {
		process.env.GITHUB_ACTIONS = "true"
		expect(isInteractive()).toBe(false)
	})

	it("should return false when GITLAB_CI is set", () => {
		process.env.GITLAB_CI = "true"
		expect(isInteractive()).toBe(false)
	})

	it("should return false when JENKINS_URL is set", () => {
		process.env.JENKINS_URL = "http://jenkins.example.com"
		expect(isInteractive()).toBe(false)
	})

	// Note: TTY behavior is not tested here as it requires special mocking setup.
	// Production code relies on actual TTY detection via process.stdin.isTTY.
	// The CI environment tests above cover the critical cases for pipeline safety.
})
