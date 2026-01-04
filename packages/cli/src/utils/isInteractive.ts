/**
 * Check if the current environment supports interactive prompts.
 * Returns false in CI environments or when stdin is not a TTY.
 */
export function isInteractive(): boolean {
	// Standard CI environment variables (check for any truthy value)
	if (process.env.CI || process.env.CONTINUOUS_INTEGRATION) {
		return false
	}

	// CI-specific environment variables not covered by the generic CI flag
	if (
		process.env.GITHUB_ACTIONS ||
		process.env.GITLAB_CI ||
		process.env.JENKINS_URL
	) {
		return false
	}

	// TTY check - false if stdin is not a terminal
	return process.stdin.isTTY === true
}
