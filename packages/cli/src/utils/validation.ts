import type { Screen } from "@screenbook/core"
import { findBestMatch } from "./suggestions.js"

export interface ValidationError {
	screenId: string
	field: "next" | "entryPoints"
	invalidRef: string
	suggestion?: string
}

export interface ValidationResult {
	valid: boolean
	errors: ValidationError[]
}

/**
 * Validate screen references (next and entryPoints)
 */
export function validateScreenReferences(screens: Screen[]): ValidationResult {
	const screenIds = new Set(screens.map((s) => s.id))
	const errors: ValidationError[] = []

	for (const screen of screens) {
		// Validate next references
		if (screen.next) {
			for (const nextId of screen.next) {
				if (!screenIds.has(nextId)) {
					errors.push({
						screenId: screen.id,
						field: "next",
						invalidRef: nextId,
						suggestion: findBestMatch(nextId, screenIds),
					})
				}
			}
		}

		// Validate entryPoints references
		if (screen.entryPoints) {
			for (const entryId of screen.entryPoints) {
				if (!screenIds.has(entryId)) {
					errors.push({
						screenId: screen.id,
						field: "entryPoints",
						invalidRef: entryId,
						suggestion: findBestMatch(entryId, screenIds),
					})
				}
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	}
}

/**
 * Format validation errors for console output
 */
export function formatValidationErrors(errors: ValidationError[]): string {
	const lines: string[] = []

	for (const error of errors) {
		lines.push(`  Screen "${error.screenId}"`)
		lines.push(
			`    → ${error.field} references non-existent screen "${error.invalidRef}"`,
		)
		if (error.suggestion) {
			lines.push(`    Did you mean "${error.suggestion}"?`)
		}
		lines.push("")
	}

	return lines.join("\n")
}
