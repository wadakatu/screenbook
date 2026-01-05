import { isAbsolute, resolve } from "node:path"
import SwaggerParser from "@apidevtools/swagger-parser"
import type { OpenAPI, OpenAPIV3 } from "openapi-types"

/**
 * Parsed OpenAPI specification with extracted API identifiers
 */
export interface ParsedOpenApiSpec {
	/** Source path/URL of the OpenAPI spec */
	readonly source: string
	/** Set of valid operationIds (e.g., "getInvoiceById") */
	readonly operationIds: ReadonlySet<string>
	/** Set of valid HTTP method + path combos (e.g., "GET /api/invoices/{id}") */
	readonly httpEndpoints: ReadonlySet<string>
	/** Map from lowercase key to original format for case-insensitive matching */
	readonly normalizedToOriginal: ReadonlyMap<string, string>
}

/**
 * Result of parsing multiple OpenAPI sources
 */
export interface OpenApiParseResult {
	/** Successfully parsed specifications */
	readonly specs: readonly ParsedOpenApiSpec[]
	/** Errors encountered during parsing */
	readonly errors: readonly OpenApiParseError[]
}

/**
 * Error encountered while parsing an OpenAPI source
 */
export interface OpenApiParseError {
	/** Source path/URL that failed to parse */
	readonly source: string
	/** Error message */
	readonly message: string
}

/**
 * Check if a string looks like a URL
 */
function isUrl(source: string): boolean {
	return source.startsWith("http://") || source.startsWith("https://")
}

/**
 * Resolve a source path relative to the current working directory
 */
function resolveSource(source: string, cwd: string): string {
	if (isUrl(source)) {
		return source
	}
	if (isAbsolute(source)) {
		return source
	}
	return resolve(cwd, source)
}

/**
 * HTTP methods to extract from OpenAPI specs
 */
const HTTP_METHODS = [
	"get",
	"post",
	"put",
	"delete",
	"patch",
	"options",
	"head",
] as const

/**
 * Extract API identifiers from a parsed OpenAPI document
 */
function extractApiIdentifiers(
	api: OpenAPI.Document,
	source: string,
): ParsedOpenApiSpec {
	const operationIds = new Set<string>()
	const httpEndpoints = new Set<string>()
	const normalizedToOriginal = new Map<string, string>()

	const paths = api.paths
	if (!paths) {
		return { source, operationIds, httpEndpoints, normalizedToOriginal }
	}

	for (const [path, pathItem] of Object.entries(paths)) {
		if (!pathItem || typeof pathItem !== "object") {
			continue
		}

		for (const method of HTTP_METHODS) {
			const operation = (
				pathItem as Record<string, OpenAPIV3.OperationObject | undefined>
			)[method]
			if (!operation) {
				continue
			}

			// Extract operationId
			if (operation.operationId) {
				operationIds.add(operation.operationId)
				// Store lowercase mapping for case-insensitive matching
				normalizedToOriginal.set(
					operation.operationId.toLowerCase(),
					operation.operationId,
				)
			}

			// Generate HTTP endpoint format: "GET /api/invoices/{id}"
			const httpEndpoint = `${method.toUpperCase()} ${path}`
			httpEndpoints.add(httpEndpoint)
			// Store normalized version for matching (lowercase method)
			normalizedToOriginal.set(httpEndpoint.toLowerCase(), httpEndpoint)
		}
	}

	return { source, operationIds, httpEndpoints, normalizedToOriginal }
}

/**
 * Parse a single OpenAPI source (file or URL)
 */
async function parseOpenApiSource(
	source: string,
	cwd: string,
): Promise<ParsedOpenApiSpec> {
	const resolvedSource = resolveSource(source, cwd)
	const api = await SwaggerParser.parse(resolvedSource)
	return extractApiIdentifiers(api, source)
}

/**
 * Parse multiple OpenAPI specification sources
 *
 * @param sources - Array of file paths or URLs to OpenAPI specifications
 * @param cwd - Current working directory for resolving relative paths
 * @returns Parsed specifications and any errors encountered
 *
 * @example
 * ```ts
 * const result = await parseOpenApiSpecs(
 *   ["./openapi.yaml", "https://api.example.com/openapi.json"],
 *   process.cwd()
 * )
 *
 * for (const spec of result.specs) {
 *   console.log(`Parsed ${spec.source}:`)
 *   console.log(`  ${spec.operationIds.size} operation IDs`)
 *   console.log(`  ${spec.httpEndpoints.size} HTTP endpoints`)
 * }
 *
 * for (const error of result.errors) {
 *   console.error(`Failed to parse ${error.source}: ${error.message}`)
 * }
 * ```
 */
export async function parseOpenApiSpecs(
	sources: readonly string[],
	cwd: string,
): Promise<OpenApiParseResult> {
	const specs: ParsedOpenApiSpec[] = []
	const errors: OpenApiParseError[] = []

	for (const source of sources) {
		try {
			const spec = await parseOpenApiSource(source, cwd)
			specs.push(spec)
		} catch (error) {
			errors.push({
				source,
				message: error instanceof Error ? error.message : String(error),
			})
		}
	}

	return { specs, errors }
}

/**
 * Get all valid API identifiers from parsed specs (for suggestions)
 */
export function getAllApiIdentifiers(
	specs: readonly ParsedOpenApiSpec[],
): string[] {
	const identifiers: string[] = []

	for (const spec of specs) {
		identifiers.push(...spec.operationIds)
		identifiers.push(...spec.httpEndpoints)
	}

	return identifiers
}
