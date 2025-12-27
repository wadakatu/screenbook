#!/usr/bin/env node

import { cli, define } from "gunshi"
import { buildCommand } from "./commands/build.js"
import { devCommand } from "./commands/dev.js"
import { initCommand } from "./commands/init.js"
import { lintCommand } from "./commands/lint.js"

const mainCommand = define({
	name: "screenbook",
	description: "Screen catalog and navigation graph generator",
	run: () => {
		console.log("Usage: screenbook <command>")
		console.log("")
		console.log("Commands:")
		console.log("  init     Initialize Screenbook in a project")
		console.log("  build    Build screen metadata JSON")
		console.log("  dev      Start the development server")
		console.log("  lint     Detect routes without screen.meta")
		console.log("")
		console.log("Run 'screenbook <command> --help' for more information")
	},
})

await cli(process.argv.slice(2), mainCommand, {
	name: "screenbook",
	version: "0.0.1",
	subCommands: {
		init: initCommand,
		build: buildCommand,
		dev: devCommand,
		lint: lintCommand,
	},
})
