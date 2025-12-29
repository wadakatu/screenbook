import type { Screen } from "@screenbook/core"

/**
 * Information about a detected cycle
 */
export interface CycleInfo {
	/**
	 * Array of screen IDs forming the cycle, including the repeated start node
	 * @example ["A", "B", "C", "A"]
	 */
	cycle: string[]
	/**
	 * True if any screen in the cycle has allowCycles: true
	 */
	allowed: boolean
}

/**
 * Result of cycle detection analysis
 */
export interface CycleDetectionResult {
	/**
	 * True if any cycles were detected
	 */
	hasCycles: boolean
	/**
	 * All detected cycles
	 */
	cycles: CycleInfo[]
	/**
	 * Cycles that are not allowed (allowed: false)
	 */
	disallowedCycles: CycleInfo[]
	/**
	 * Screen IDs that appear more than once (indicates data issue)
	 */
	duplicateIds: string[]
}

// Node colors for DFS
enum Color {
	White = 0, // Unvisited
	Gray = 1, // In progress (on current path)
	Black = 2, // Completed
}

/**
 * Detect circular navigation dependencies in screen definitions.
 * Uses DFS with coloring algorithm: O(V + E) complexity.
 *
 * @example
 * ```ts
 * const screens = [
 *   { id: "A", next: ["B"] },
 *   { id: "B", next: ["C"] },
 *   { id: "C", next: ["A"] }, // Creates cycle A → B → C → A
 * ]
 * const result = detectCycles(screens)
 * // result.hasCycles === true
 * // result.cycles[0].cycle === ["A", "B", "C", "A"]
 * ```
 */
export function detectCycles(screens: Screen[]): CycleDetectionResult {
	const screenMap = new Map<string, Screen>()
	const duplicateIds: string[] = []

	// Build screen map and detect duplicates
	for (const screen of screens) {
		if (!screen.id || typeof screen.id !== "string") {
			// Skip screens with invalid IDs
			continue
		}
		if (screenMap.has(screen.id)) {
			duplicateIds.push(screen.id)
		}
		screenMap.set(screen.id, screen)
	}

	const color = new Map<string, Color>()
	const parent = new Map<string, string | null>()
	const cycles: CycleInfo[] = []

	// Initialize all nodes as white
	for (const id of screenMap.keys()) {
		color.set(id, Color.White)
	}

	// DFS from each unvisited node
	for (const id of screenMap.keys()) {
		if (color.get(id) === Color.White) {
			dfs(id, null)
		}
	}

	function dfs(nodeId: string, parentId: string | null): void {
		color.set(nodeId, Color.Gray)
		parent.set(nodeId, parentId)

		const node = screenMap.get(nodeId)
		const neighbors = node?.next ?? []

		for (const neighborId of neighbors) {
			const neighborColor = color.get(neighborId)

			if (neighborColor === Color.Gray) {
				// Back edge found - cycle detected
				const cyclePath = reconstructCycle(nodeId, neighborId)
				const allowed = isCycleAllowed(cyclePath, screenMap)
				cycles.push({ cycle: cyclePath, allowed })
			} else if (neighborColor === Color.White) {
				// Only visit if the neighbor exists in our screen map
				if (screenMap.has(neighborId)) {
					dfs(neighborId, nodeId)
				}
			}
			// If Black, already fully processed - skip
		}

		color.set(nodeId, Color.Black)
	}

	/**
	 * Reconstruct cycle path from back edge
	 */
	function reconstructCycle(from: string, to: string): string[] {
		const path: string[] = []
		let current: string | null | undefined = from
		const visited = new Set<string>()
		const maxIterations = screenMap.size + 1

		// Trace back from 'from' to 'to' with loop guard
		while (
			current &&
			current !== to &&
			!visited.has(current) &&
			path.length < maxIterations
		) {
			visited.add(current)
			path.unshift(current)
			current = parent.get(current)
		}

		// Add 'to' at the beginning (the cycle start)
		path.unshift(to)

		// Add 'to' at the end to close the cycle
		path.push(to)

		return path
	}

	const disallowedCycles = cycles.filter((c) => !c.allowed)

	return {
		hasCycles: cycles.length > 0,
		cycles,
		disallowedCycles,
		duplicateIds,
	}
}

/**
 * Check if any screen in the cycle has allowCycles: true
 */
function isCycleAllowed(
	cyclePath: string[],
	screenMap: Map<string, Screen>,
): boolean {
	// Exclude the last element as it's a duplicate of the first
	const uniqueNodes = cyclePath.slice(0, -1)

	for (const nodeId of uniqueNodes) {
		const screen = screenMap.get(nodeId)
		if (screen?.allowCycles === true) {
			return true
		}
	}

	return false
}

/**
 * Format cycle information for console output
 *
 * @example
 * ```
 *   Cycle 1: A → B → C → A
 *   Cycle 2 (allowed): D → E → D
 * ```
 */
export function formatCycleWarnings(cycles: CycleInfo[]): string {
	if (cycles.length === 0) {
		return ""
	}

	const lines: string[] = []

	for (let i = 0; i < cycles.length; i++) {
		const cycle = cycles[i]
		if (!cycle) continue

		const cycleStr = cycle.cycle.join(" → ")
		const allowedSuffix = cycle.allowed ? " (allowed)" : ""
		lines.push(`  Cycle ${i + 1}${allowedSuffix}: ${cycleStr}`)
	}

	return lines.join("\n")
}

/**
 * Get a summary of cycle detection results
 */
export function getCycleSummary(result: CycleDetectionResult): string {
	if (!result.hasCycles) {
		return "No circular navigation detected"
	}

	const total = result.cycles.length
	const disallowed = result.disallowedCycles.length
	const allowed = total - disallowed

	if (disallowed === 0) {
		return `${total} circular navigation${total > 1 ? "s" : ""} detected (all allowed)`
	}

	if (allowed === 0) {
		return `${total} circular navigation${total > 1 ? "s" : ""} detected`
	}

	return `${total} circular navigation${total > 1 ? "s" : ""} detected (${disallowed} not allowed, ${allowed} allowed)`
}
