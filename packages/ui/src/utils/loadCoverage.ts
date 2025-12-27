import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

export interface CoverageData {
	total: number
	covered: number
	percentage: number
	missing: Array<{
		route: string
		suggestedPath: string
	}>
	byOwner: Record<string, { count: number; screens: string[] }>
	byTag: Record<string, number>
	timestamp: string
}

export function loadCoverage(): CoverageData | null {
	const coveragePath = join(process.cwd(), ".screenbook", "coverage.json")

	if (!existsSync(coveragePath)) {
		return null
	}

	try {
		const content = readFileSync(coveragePath, "utf-8")
		return JSON.parse(content) as CoverageData
	} catch {
		return null
	}
}
