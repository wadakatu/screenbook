import { promises as fs } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { generate } from "gunshi/generator"

// Import commands from CLI package
import { buildCommand } from "../../packages/cli/src/commands/build.js"
import { devCommand } from "../../packages/cli/src/commands/dev.js"
import { generateCommand } from "../../packages/cli/src/commands/generate.js"
import { impactCommand } from "../../packages/cli/src/commands/impact.js"
import { initCommand } from "../../packages/cli/src/commands/init.js"
import { lintCommand } from "../../packages/cli/src/commands/lint.js"
import { prImpactCommand } from "../../packages/cli/src/commands/pr-impact.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLI_DOCS_DIR = join(__dirname, "../src/content/docs/cli")

const CLI_OPTIONS = {
	name: "screenbook",
	version: "0.1.0",
	description: "Screen catalog and navigation graph generator",
}

interface CommandInfo {
	name: string
	command: Parameters<typeof generate>[1]
	description: string
	examples: string[]
}

const commands: CommandInfo[] = [
	{
		name: "init",
		command: initCommand,
		description: "Initialize Screenbook in a project",
		examples: [
			"screenbook init",
			"screenbook init --force",
			"screenbook init --skip-detect",
		],
	},
	{
		name: "generate",
		command: generateCommand,
		description: "Auto-generate screen.meta.ts files from route files",
		examples: [
			"screenbook generate",
			"screenbook generate --dry-run",
			"screenbook generate --force",
		],
	},
	{
		name: "build",
		command: buildCommand,
		description: "Build screen metadata JSON from screen.meta.ts files",
		examples: [
			"screenbook build",
			"screenbook build --strict",
			"screenbook build --out-dir .screenbook",
		],
	},
	{
		name: "dev",
		command: devCommand,
		description: "Start the Screenbook development server",
		examples: ["screenbook dev", "screenbook dev --port 3000"],
	},
	{
		name: "lint",
		command: lintCommand,
		description: "Detect routes without screen.meta.ts files",
		examples: [
			"screenbook lint",
			"screenbook lint --config screenbook.config.ts",
		],
	},
	{
		name: "impact",
		command: impactCommand,
		description: "Analyze which screens depend on a specific API/service",
		examples: [
			"screenbook impact InvoiceAPI.getDetail",
			"screenbook impact PaymentService --format json",
			"screenbook impact UserAPI --depth 5",
		],
	},
	{
		name: "pr-impact",
		command: prImpactCommand,
		description: "Analyze impact of changed files in a PR",
		examples: [
			"screenbook pr-impact",
			"screenbook pr-impact --base develop",
			"screenbook pr-impact --format json",
		],
	},
]

async function generateCliDocs() {
	// Ensure directory exists
	await fs.mkdir(CLI_DOCS_DIR, { recursive: true })

	// Generate index page
	const indexContent = generateIndexPage()
	await fs.writeFile(join(CLI_DOCS_DIR, "index.mdx"), indexContent)
	console.log("Generated: cli/index.mdx")

	// Generate individual command pages
	for (const cmd of commands) {
		const usageText = await generate(cmd.name, cmd.command, CLI_OPTIONS)
		const content = generateCommandPage(cmd, usageText)
		await fs.writeFile(join(CLI_DOCS_DIR, `${cmd.name}.mdx`), content)
		console.log(`Generated: cli/${cmd.name}.mdx`)
	}

	console.log("\nCLI documentation generated successfully!")
}

function generateIndexPage(): string {
	return `---
title: CLI Commands
description: Complete reference for all Screenbook CLI commands
---

import { Card, CardGrid } from '@astrojs/starlight/components';

Screenbook provides a powerful CLI to manage your screen catalog.

## Installation

\`\`\`bash
npm install -D screenbook
# or
pnpm add -D screenbook
\`\`\`

## Commands

<CardGrid>
${commands.map((cmd) => `  <Card title="${cmd.name}" icon="terminal">\n    ${cmd.description}\n  </Card>`).join("\n")}
</CardGrid>

## Global Options

All commands support the following global options:

| Option | Description |
|--------|-------------|
| \`--help, -h\` | Show help information |
| \`--version, -v\` | Show version number |
| \`--config, -c\` | Path to config file |
`
}

function generateCommandPage(cmd: CommandInfo, usageText: string): string {
	return `---
title: screenbook ${cmd.name}
description: ${cmd.description}
---

${cmd.description}

## Usage

\`\`\`
${usageText}
\`\`\`

## Examples

\`\`\`bash
${cmd.examples.join("\n")}
\`\`\`
`
}

generateCliDocs().catch(console.error)
