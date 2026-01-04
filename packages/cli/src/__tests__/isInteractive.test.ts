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

	// Note: Testing TTY behavior is difficult in test environment
	// because process.stdin.isTTY cannot be reliably mocked.
	// The CI environment tests above cover the important cases.
})
