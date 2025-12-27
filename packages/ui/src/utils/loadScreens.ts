import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { Screen } from "@screenbook/core"

export function loadScreens(): Screen[] {
	const screensPath = join(process.cwd(), ".screenbook", "screens.json")

	if (!existsSync(screensPath)) {
		return []
	}

	try {
		const content = readFileSync(screensPath, "utf-8")
		return JSON.parse(content) as Screen[]
	} catch {
		return []
	}
}
