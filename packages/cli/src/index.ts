#!/usr/bin/env node

import { cli, define } from "gunshi"
import { buildCommand } from "./commands/build.js"
import { devCommand } from "./commands/dev.js"
import { generateCommand } from "./commands/generate.js"
import { impactCommand } from "./commands/impact.js"
import { initCommand } from "./commands/init.js"
import { lintCommand } from "./commands/lint.js"
import { prImpactCommand } from "./commands/pr-impact.js"

const mainCommand = define({
	name: "screenbook",
	description: "Screen catalog and navigation graph generator",
	run: () => {
		console.log("Usage: screenbook <command>")
		console.log("")
		console.log("Commands:")
		console.log("  init       Initialize Screenbook in a project")
		console.log("  generate   Auto-generate screen.meta.ts from routes")
		console.log("  build      Build screen metadata JSON")
		console.log("  dev        Start the development server")
		console.log("  lint       Detect routes without screen.meta")
		console.log("  impact     Analyze API dependency impact")
		console.log("  pr-impact  Analyze PR changes impact")
		console.log("")
		console.log("Run 'screenbook <command> --help' for more information")
	},
})

await cli(process.argv.slice(2), mainCommand, {
	name: "screenbook",
	version: "0.0.1",
	subCommands: {
		init: initCommand,
		generate: generateCommand,
		build: buildCommand,
		dev: devCommand,
		lint: lintCommand,
		impact: impactCommand,
		"pr-impact": prImpactCommand,
	},
})
