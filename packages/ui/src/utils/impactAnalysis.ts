import type { Screen } from "@screenbook/core"

export interface TransitiveDependency {
	screen: Screen
	path: string[]
}

export interface ImpactResult {
	api: string
	direct: Screen[]
	transitive: TransitiveDependency[]
	totalCount: number
}

/**
 * Check if a screen's dependsOn matches the API name (supports partial matching).
 */
function matchesDependency(dependency: string, apiName: string): boolean {
	if (dependency === apiName) {
		return true
	}
	if (dependency.startsWith(`${apiName}.`)) {
		return true
	}
	if (apiName.startsWith(`${dependency}.`)) {
		return true
	}
	return false
}

/**
 * Find screens that directly depend on the given API.
 */
function findDirectDependents(screens: Screen[], apiName: string): Screen[] {
	return screens.filter((screen) =>
		screen.dependsOn?.some((dep) => matchesDependency(dep, apiName)),
	)
}

/**
 * Build a navigation graph from `next` field.
 */
function buildNavigationGraph(screens: Screen[]): Map<string, Set<string>> {
	const graph = new Map<string, Set<string>>()

	for (const screen of screens) {
		if (!screen.next) continue

		if (!graph.has(screen.id)) {
			graph.set(screen.id, new Set())
		}
		for (const nextId of screen.next) {
			graph.get(screen.id)!.add(nextId)
		}
	}

	return graph
}

/**
 * Find a path from a screen to any directly dependent screen using BFS.
 */
function findPathToDirectDependent(
	startId: string,
	targetIds: Set<string>,
	graph: Map<string, Set<string>>,
	maxDepth: number,
): string[] | null {
	const queue: Array<{ id: string; path: string[] }> = [
		{ id: startId, path: [startId] },
	]
	const localVisited = new Set<string>([startId])

	while (queue.length > 0) {
		const current = queue.shift()!

		if (current.path.length > maxDepth + 1) {
			continue
		}

		const neighbors = graph.get(current.id)
		if (!neighbors) {
			continue
		}

		for (const neighborId of neighbors) {
			if (localVisited.has(neighborId)) {
				continue
			}

			const newPath = [...current.path, neighborId]

			if (newPath.length > maxDepth + 1) {
				continue
			}

			if (targetIds.has(neighborId)) {
				return newPath
			}

			localVisited.add(neighborId)
			queue.push({ id: neighborId, path: newPath })
		}
	}

	return null
}

/**
 * Find all transitive dependents using BFS.
 */
function findTransitiveDependents(
	screens: Screen[],
	directDependentIds: Set<string>,
	maxDepth: number,
): TransitiveDependency[] {
	const navigationGraph = buildNavigationGraph(screens)
	const transitive: TransitiveDependency[] = []
	const visited = new Set<string>()

	for (const screen of screens) {
		if (directDependentIds.has(screen.id)) {
			continue
		}

		const path = findPathToDirectDependent(
			screen.id,
			directDependentIds,
			navigationGraph,
			maxDepth,
		)

		if (path && !visited.has(screen.id)) {
			visited.add(screen.id)
			transitive.push({
				screen,
				path,
			})
		}
	}

	return transitive
}

/**
 * Analyze the impact of a change to an API on the screen catalog.
 */
export function analyzeImpact(
	screens: Screen[],
	apiName: string,
	maxDepth = 3,
): ImpactResult {
	const direct = findDirectDependents(screens, apiName)
	const directIds = new Set(direct.map((s) => s.id))
	const transitive = findTransitiveDependents(screens, directIds, maxDepth)

	return {
		api: apiName,
		direct,
		transitive,
		totalCount: direct.length + transitive.length,
	}
}

/**
 * Get all unique APIs from screens' dependsOn fields.
 */
export function getAllApis(screens: Screen[]): string[] {
	const apis = new Set<string>()
	for (const screen of screens) {
		if (screen.dependsOn) {
			for (const dep of screen.dependsOn) {
				apis.add(dep)
			}
		}
	}
	return Array.from(apis).sort()
}

/**
 * Count how many screens depend on each API.
 */
export function getApiDependencyCount(screens: Screen[]): Map<string, number> {
	const counts = new Map<string, number>()
	for (const screen of screens) {
		if (screen.dependsOn) {
			for (const dep of screen.dependsOn) {
				counts.set(dep, (counts.get(dep) || 0) + 1)
			}
		}
	}
	return counts
}

/**
 * Generate Mermaid graph with impact highlighting.
 */
export function generateImpactMermaid(
	screens: Screen[],
	result: ImpactResult,
): string {
	const directIds = new Set(result.direct.map((s) => s.id))
	const transitiveIds = new Set(result.transitive.map((t) => t.screen.id))

	const lines: string[] = ["flowchart TD"]

	// Define styles - high contrast colors with readable text
	lines.push("    classDef direct fill:#dc2626,stroke:#fef2f2,color:#ffffff,stroke-width:3px,font-weight:bold")
	lines.push("    classDef transitive fill:#ea580c,stroke:#fff7ed,color:#ffffff,stroke-width:3px,font-weight:bold")
	lines.push("    classDef normal fill:#1e293b,stroke:#64748b,color:#e2e8f0,stroke-width:1px")

	// Add nodes
	for (const screen of screens) {
		const label = screen.title.replace(/"/g, "'")
		const id = screen.id.replace(/\./g, "_")
		lines.push(`    ${id}["${label}"]`)
	}

	lines.push("")

	// Add edges
	for (const screen of screens) {
		if (screen.next) {
			const fromId = screen.id.replace(/\./g, "_")
			for (const nextId of screen.next) {
				const toId = nextId.replace(/\./g, "_")
				lines.push(`    ${fromId} --> ${toId}`)
			}
		}
	}

	lines.push("")

	// Apply styles
	const directNodes = screens
		.filter((s) => directIds.has(s.id))
		.map((s) => s.id.replace(/\./g, "_"))
	const transitiveNodes = screens
		.filter((s) => transitiveIds.has(s.id))
		.map((s) => s.id.replace(/\./g, "_"))
	const normalNodes = screens
		.filter((s) => !directIds.has(s.id) && !transitiveIds.has(s.id))
		.map((s) => s.id.replace(/\./g, "_"))

	if (directNodes.length > 0) {
		lines.push(`    class ${directNodes.join(",")} direct`)
	}
	if (transitiveNodes.length > 0) {
		lines.push(`    class ${transitiveNodes.join(",")} transitive`)
	}
	if (normalNodes.length > 0) {
		lines.push(`    class ${normalNodes.join(",")} normal`)
	}

	return lines.join("\n")
}

/**
 * Format the impact result as Markdown for PR comments.
 */
export function formatImpactMarkdown(result: ImpactResult): string {
	const lines: string[] = []

	lines.push(`## Impact Analysis: \`${result.api}\``)
	lines.push("")

	if (result.totalCount === 0) {
		lines.push("No screens depend on this API.")
		return lines.join("\n")
	}

	lines.push(
		`**${result.totalCount} screen${result.totalCount > 1 ? "s" : ""} affected**`,
	)
	lines.push("")

	if (result.direct.length > 0) {
		lines.push(`### Direct Dependencies (${result.direct.length})`)
		lines.push("")
		for (const screen of result.direct) {
			const owner = screen.owner?.length ? ` - ${screen.owner.join(", ")}` : ""
			lines.push(`- **${screen.title}** (\`${screen.route}\`)${owner}`)
		}
		lines.push("")
	}

	if (result.transitive.length > 0) {
		lines.push(`### Transitive Dependencies (${result.transitive.length})`)
		lines.push("")
		for (const { screen, path } of result.transitive) {
			lines.push(`- **${screen.title}** via \`${path.join(" → ")}\``)
		}
		lines.push("")
	}

	return lines.join("\n")
}
