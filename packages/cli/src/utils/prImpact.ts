import { basename, dirname } from "node:path"
import type { ImpactResult } from "./impactAnalysis.js"

/**
 * Extract potential API names from changed file paths.
 * Looks for common API file patterns.
 */
export function extractApiNames(files: string[]): string[] {
	const apis = new Set<string>()

	for (const file of files) {
		const fileName = basename(file, ".ts")
			.replace(/\.tsx?$/, "")
			.replace(/\.js$/, "")
			.replace(/\.jsx?$/, "")

		const dirName = basename(dirname(file))

		// Pattern: src/api/InvoiceAPI.ts -> InvoiceAPI
		if (
			file.includes("/api/") ||
			file.includes("/apis/") ||
			file.includes("/services/")
		) {
			if (
				fileName.endsWith("API") ||
				fileName.endsWith("Api") ||
				fileName.endsWith("Service")
			) {
				apis.add(fileName)
			}
		}

		// Pattern: src/services/invoice/index.ts -> InvoiceService
		if (
			file.includes("/services/") &&
			(fileName === "index" || fileName === dirName)
		) {
			const serviceName = `${capitalize(dirName)}Service`
			apis.add(serviceName)
		}

		// Pattern: src/api/invoice.ts -> InvoiceAPI
		if (file.includes("/api/") || file.includes("/apis/")) {
			if (!fileName.endsWith("API") && !fileName.endsWith("Api")) {
				const apiName = `${capitalize(fileName)}API`
				apis.add(apiName)
			}
		}

		// Pattern: explicit API/Service file names
		if (
			fileName.toLowerCase().includes("api") ||
			fileName.toLowerCase().includes("service")
		) {
			apis.add(fileName)
		}
	}

	return Array.from(apis).sort()
}

export function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Format the results as Markdown for PR comments.
 */
export function formatMarkdown(
	changedFiles: string[],
	detectedApis: string[],
	results: ImpactResult[],
): string {
	const lines: string[] = []

	lines.push("## Screenbook Impact Analysis")
	lines.push("")

	if (results.length === 0) {
		lines.push("No screen impacts detected from the API changes in this PR.")
		lines.push("")
		lines.push("<details>")
		lines.push("<summary>Detected APIs (no screen dependencies)</summary>")
		lines.push("")
		for (const api of detectedApis) {
			lines.push(`- \`${api}\``)
		}
		lines.push("")
		lines.push("</details>")
		return lines.join("\n")
	}

	// Summary
	const totalDirect = results.reduce((sum, r) => sum + r.direct.length, 0)
	const totalTransitive = results.reduce(
		(sum, r) => sum + r.transitive.length,
		0,
	)
	const totalScreens = totalDirect + totalTransitive

	lines.push(
		`**${totalScreens} screen${totalScreens > 1 ? "s" : ""} affected** by changes to ${results.length} API${results.length > 1 ? "s" : ""}`,
	)
	lines.push("")

	// Per-API breakdown
	for (const result of results) {
		lines.push(`### ${result.api}`)
		lines.push("")

		if (result.direct.length > 0) {
			lines.push(`**Direct dependencies** (${result.direct.length}):`)
			lines.push("")
			lines.push("| Screen | Route | Owner |")
			lines.push("|--------|-------|-------|")
			for (const screen of result.direct) {
				const owner = screen.owner?.join(", ") ?? "-"
				lines.push(`| ${screen.id} | \`${screen.route}\` | ${owner} |`)
			}
			lines.push("")
		}

		if (result.transitive.length > 0) {
			lines.push(`**Transitive dependencies** (${result.transitive.length}):`)
			lines.push("")
			for (const { path } of result.transitive) {
				lines.push(`- ${path.join(" → ")}`)
			}
			lines.push("")
		}
	}

	// Changed files summary
	lines.push("<details>")
	lines.push(`<summary>Changed files (${changedFiles.length})</summary>`)
	lines.push("")
	for (const file of changedFiles.slice(0, 20)) {
		lines.push(`- \`${file}\``)
	}
	if (changedFiles.length > 20) {
		lines.push(`- ... and ${changedFiles.length - 20} more`)
	}
	lines.push("")
	lines.push("</details>")

	return lines.join("\n")
}
