/**
 * Check if the current environment supports interactive prompts
 */
export function isInteractive(): boolean {
	// Explicit CI environment
	if (process.env.CI === "true" || process.env.CONTINUOUS_INTEGRATION) {
		return false
	}
	// Check for common CI environments
	if (
		process.env.GITHUB_ACTIONS ||
		process.env.GITLAB_CI ||
		process.env.JENKINS_URL
	) {
		return false
	}
	// TTY check
	return process.stdin.isTTY === true
}
