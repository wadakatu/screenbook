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
 * - "InvoiceAPI" matches "InvoiceAPI.getDetail"
 * - "InvoiceAPI.getDetail" matches "InvoiceAPI.getDetail"
 */
function matchesDependency(dependency: string, apiName: string): boolean {
	// Exact match
	if (dependency === apiName) {
		return true
	}
	// Partial match: apiName is a prefix of dependency
	if (dependency.startsWith(`${apiName}.`)) {
		return true
	}
	// Partial match: dependency is a prefix of apiName
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
 * Build a reverse navigation graph: screenId -> screens that can navigate to it.
 * This is built from the `entryPoints` field.
 */
function _buildReverseNavigationGraph(
	screens: Screen[],
): Map<string, Set<string>> {
	const graph = new Map<string, Set<string>>()

	for (const screen of screens) {
		// entryPoints lists screens that can navigate TO this screen
		// So we want to find screens that navigate FROM here
		// Actually, we need to reverse: if A.entryPoints includes B,
		// then B can navigate to A, so B is affected if A is affected

		// For transitive analysis:
		// If screen A depends on API, and screen B has entryPoints: ["A"],
		// then B can navigate to A, meaning users can reach A from B
		// So if A is impacted, we should show B as transitively impacted

		if (!screen.entryPoints) continue

		for (const entryPoint of screen.entryPoints) {
			if (!graph.has(screen.id)) {
				graph.set(screen.id, new Set())
			}
			graph.get(screen.id)?.add(entryPoint)
		}
	}

	return graph
}

/**
 * Build a navigation graph from `next` field: screenId -> screens it can navigate to.
 */
function buildNavigationGraph(screens: Screen[]): Map<string, Set<string>> {
	const graph = new Map<string, Set<string>>()

	for (const screen of screens) {
		if (!screen.next) continue

		if (!graph.has(screen.id)) {
			graph.set(screen.id, new Set())
		}
		for (const nextId of screen.next) {
			graph.get(screen.id)?.add(nextId)
		}
	}

	return graph
}

/**
 * Find all transitive dependents using BFS.
 * A screen is transitively dependent if it can navigate to a directly dependent screen.
 */
function findTransitiveDependents(
	screens: Screen[],
	directDependentIds: Set<string>,
	maxDepth: number,
): TransitiveDependency[] {
	const _screenMap = new Map(screens.map((s) => [s.id, s]))
	const navigationGraph = buildNavigationGraph(screens)
	const transitive: TransitiveDependency[] = []
	const visited = new Set<string>()

	// For each screen, check if it can reach a directly dependent screen
	for (const screen of screens) {
		if (directDependentIds.has(screen.id)) {
			continue // Skip direct dependents
		}

		const path = findPathToDirectDependent(
			screen.id,
			directDependentIds,
			navigationGraph,
			maxDepth,
			new Set(),
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
 * Find a path from a screen to any directly dependent screen using BFS.
 */
function findPathToDirectDependent(
	startId: string,
	targetIds: Set<string>,
	graph: Map<string, Set<string>>,
	maxDepth: number,
	visited: Set<string>,
): string[] | null {
	if (visited.has(startId)) {
		return null
	}

	const queue: Array<{ id: string; path: string[] }> = [
		{ id: startId, path: [startId] },
	]
	const localVisited = new Set<string>([startId])

	while (queue.length > 0) {
		const current = queue.shift()
		if (!current) break

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

			// Check if path exceeds maxDepth (path includes start, so maxDepth+1 is the max length)
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
 * Analyze the impact of a change to an API on the screen catalog.
 */
export function analyzeImpact(
	screens: Screen[],
	apiName: string,
	maxDepth = 3,
): ImpactResult {
	// Find direct dependents
	const direct = findDirectDependents(screens, apiName)
	const directIds = new Set(direct.map((s) => s.id))

	// Find transitive dependents
	const transitive = findTransitiveDependents(screens, directIds, maxDepth)

	return {
		api: apiName,
		direct,
		transitive,
		totalCount: direct.length + transitive.length,
	}
}

/**
 * Format the impact result as text output.
 */
export function formatImpactText(result: ImpactResult): string {
	const lines: string[] = []

	lines.push(`Impact Analysis: ${result.api}`)
	lines.push("")

	if (result.direct.length > 0) {
		lines.push(
			`Direct (${result.direct.length} screen${result.direct.length > 1 ? "s" : ""}):`,
		)
		for (const screen of result.direct) {
			const owner = screen.owner?.length ? ` [${screen.owner.join(", ")}]` : ""
			lines.push(`  - ${screen.id}  ${screen.route}${owner}`)
		}
		lines.push("")
	}

	if (result.transitive.length > 0) {
		lines.push(
			`Transitive (${result.transitive.length} screen${result.transitive.length > 1 ? "s" : ""}):`,
		)
		for (const { path } of result.transitive) {
			lines.push(`  - ${path.join(" -> ")}`)
		}
		lines.push("")
	}

	if (result.totalCount === 0) {
		lines.push("No screens depend on this API.")
		lines.push("")
	} else {
		lines.push(
			`Total: ${result.totalCount} screen${result.totalCount > 1 ? "s" : ""} affected`,
		)
	}

	return lines.join("\n")
}

/**
 * Format the impact result as JSON output.
 */
export function formatImpactJson(result: ImpactResult): string {
	return JSON.stringify(
		{
			api: result.api,
			summary: {
				directCount: result.direct.length,
				transitiveCount: result.transitive.length,
				totalCount: result.totalCount,
			},
			direct: result.direct.map((s) => ({
				id: s.id,
				title: s.title,
				route: s.route,
				owner: s.owner,
			})),
			transitive: result.transitive.map(({ screen, path }) => ({
				id: screen.id,
				title: screen.title,
				route: screen.route,
				path,
			})),
		},
		null,
		2,
	)
}
