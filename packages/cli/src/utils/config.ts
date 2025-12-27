import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { type Config, defineConfig } from "@screenbook/core"
import { createJiti } from "jiti"

const CONFIG_FILES = [
	"screenbook.config.ts",
	"screenbook.config.js",
	"screenbook.config.mjs",
]

export async function loadConfig(configPath?: string): Promise<Config> {
	const cwd = process.cwd()

	// If config path is provided, use it
	if (configPath) {
		const absolutePath = resolve(cwd, configPath)
		if (!existsSync(absolutePath)) {
			throw new Error(`Config file not found: ${configPath}`)
		}
		return await importConfig(absolutePath, cwd)
	}

	// Search for config file in cwd
	for (const configFile of CONFIG_FILES) {
		const absolutePath = resolve(cwd, configFile)
		if (existsSync(absolutePath)) {
			return await importConfig(absolutePath, cwd)
		}
	}

	// Return default config if no config file found
	return defineConfig()
}

async function importConfig(
	absolutePath: string,
	cwd: string,
): Promise<Config> {
	const jiti = createJiti(cwd)
	const module = (await jiti.import(absolutePath)) as { default?: Config }

	if (module.default) {
		return module.default
	}

	throw new Error(`Config file must have a default export: ${absolutePath}`)
}
