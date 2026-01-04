/**
 * Generate Framework Support tables for README.md
 * from the single source of truth in docs/src/data/frameworks.ts
 */

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, "..")

interface Framework {
	name: string
	status: "supported" | "planned"
	autoGenerate: boolean
	routingType: "file-based" | "config-based"
	routesPattern?: string
}

async function main() {
	// Import framework data
	const { frameworks } = (await import("../docs/src/data/frameworks.js")) as {
		frameworks: Framework[]
	}

	const fileBasedFrameworks = frameworks.filter(
		(f) => f.routingType === "file-based",
	)
	const configBasedFrameworks = frameworks.filter(
		(f) => f.routingType === "config-based",
	)

	// Generate markdown tables
	const fileBasedTable = generateTable(fileBasedFrameworks)
	const configBasedTable = generateTable(configBasedFrameworks)

	const tableContent = `### File-based Routing

${fileBasedTable}

### Config-based Routing

${configBasedTable}

> **Note:** For config-based routers, configure \`routesFile\` in your screenbook config to enable automatic screen.meta.ts generation.
>
> Even without auto-generate, you can manually create \`screen.meta.ts\` files for any framework.`

	// Read README.md
	const readmePath = join(rootDir, "README.md")
	let readme = readFileSync(readmePath, "utf-8")

	// Replace content between markers
	const startMarker = "<!-- FRAMEWORK_TABLE_START -->"
	const endMarker = "<!-- FRAMEWORK_TABLE_END -->"

	const startIndex = readme.indexOf(startMarker)
	const endIndex = readme.indexOf(endMarker)

	if (startIndex === -1 || endIndex === -1) {
		console.error("Error: Could not find framework table markers in README.md")
		console.log("Please add the following markers to README.md:")
		console.log(`  ${startMarker}`)
		console.log(`  ${endMarker}`)
		process.exit(1)
	}

	const before = readme.slice(0, startIndex + startMarker.length)
	const after = readme.slice(endIndex)

	readme = `${before}\n\n${tableContent}\n\n${after}`

	// Write updated README.md
	writeFileSync(readmePath, readme)
	console.log("Updated Framework Support tables in README.md")
}

function generateTable(frameworks: Framework[]): string {
	const rows = frameworks.map((f) => {
		const status = f.status === "supported" ? "✅ Supported" : "🚧 Planned"
		const autoGen = f.autoGenerate ? "✅" : "🚧"
		return `| **${f.name}** | ${status} | ${autoGen} |`
	})

	return `| Framework | Status | Auto-generate |
|-----------|--------|---------------|
${rows.join("\n")}`
}

main().catch(console.error)
