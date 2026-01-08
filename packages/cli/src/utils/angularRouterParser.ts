import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { parse } from "@babel/parser"
import {
	type ParsedRoute,
	type ParseResult,
	type ParseWarning,
	resolveImportPath,
} from "./routeParserUtils.js"

// Re-export shared types
export type { ParsedRoute, ParseResult, ParseWarning }

/**
 * Parse Angular Router configuration file and extract routes.
 * Supports both Standalone (Angular 14+) and NgModule patterns.
 *
 * Supported patterns:
 * - `export const routes: Routes = [...]`
 * - `const routes: Routes = [...]`
 * - `RouterModule.forRoot([...])`
 * - `RouterModule.forChild([...])`
 * - `export default [...]`
 * - `export default [...] satisfies Routes`
 *
 * @param filePath - Path to the router configuration file
 * @param preloadedContent - Optional pre-read file content. When provided, the file is not read from disk,
 *                           enabling testing with virtual content or avoiding duplicate file reads.
 * @returns ParseResult containing extracted routes and any warnings
 * @throws Error if the file cannot be read or contains syntax errors
 */
export function parseAngularRouterConfig(
	filePath: string,
	preloadedContent?: string,
): ParseResult {
	const absolutePath = resolve(filePath)
	const routesFileDir = dirname(absolutePath)
	const warnings: ParseWarning[] = []

	// Read file with proper error handling (skip if content is preloaded)
	let content: string
	if (preloadedContent !== undefined) {
		content = preloadedContent
	} else {
		try {
			content = readFileSync(absolutePath, "utf-8")
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			throw new Error(
				`Failed to read routes file "${absolutePath}": ${message}`,
			)
		}
	}

	// Parse with Babel - wrap for better error messages
	let ast: ReturnType<typeof parse>
	try {
		ast = parse(content, {
			sourceType: "module",
			plugins: ["typescript", ["decorators", { decoratorsBeforeExport: true }]],
		})
	} catch (error) {
		if (error instanceof SyntaxError) {
			throw new Error(
				`Syntax error in routes file "${absolutePath}": ${error.message}`,
			)
		}
		const message = error instanceof Error ? error.message : String(error)
		throw new Error(`Failed to parse routes file "${absolutePath}": ${message}`)
	}

	const routes: ParsedRoute[] = []

	// Find routes array in the AST
	for (const node of ast.program.body) {
		// Handle: const routes: Routes = [...] or export const routes: Routes = [...]
		if (node.type === "VariableDeclaration") {
			for (const decl of node.declarations) {
				if (
					decl.id.type === "Identifier" &&
					decl.init?.type === "ArrayExpression"
				) {
					// Check if it looks like a routes array (name contains "route" or has Routes type)
					// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
					const typeAnnotation = (decl.id as any).typeAnnotation?.typeAnnotation
					const isRoutesVariable =
						decl.id.name.toLowerCase().includes("route") ||
						(typeAnnotation?.type === "TSTypeReference" &&
							typeAnnotation.typeName?.type === "Identifier" &&
							typeAnnotation.typeName.name === "Routes")
					if (isRoutesVariable) {
						const parsed = parseRoutesArray(decl.init, routesFileDir, warnings)
						routes.push(...parsed)
					}
				}
			}
		}

		// Handle: export const routes: Routes = [...]
		if (
			node.type === "ExportNamedDeclaration" &&
			node.declaration?.type === "VariableDeclaration"
		) {
			for (const decl of node.declaration.declarations) {
				if (
					decl.id.type === "Identifier" &&
					decl.init?.type === "ArrayExpression"
				) {
					// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
					const typeAnnotation = (decl.id as any).typeAnnotation?.typeAnnotation
					const isRoutesVariable =
						decl.id.name.toLowerCase().includes("route") ||
						(typeAnnotation?.type === "TSTypeReference" &&
							typeAnnotation.typeName?.type === "Identifier" &&
							typeAnnotation.typeName.name === "Routes")
					if (isRoutesVariable) {
						const parsed = parseRoutesArray(decl.init, routesFileDir, warnings)
						routes.push(...parsed)
					}
				}
			}
		}

		// Handle: export default [...] (less common but possible)
		if (
			node.type === "ExportDefaultDeclaration" &&
			node.declaration.type === "ArrayExpression"
		) {
			const parsed = parseRoutesArray(node.declaration, routesFileDir, warnings)
			routes.push(...parsed)
		}

		// Handle: export default [...] satisfies Routes
		if (
			node.type === "ExportDefaultDeclaration" &&
			node.declaration.type === "TSSatisfiesExpression" &&
			node.declaration.expression.type === "ArrayExpression"
		) {
			const parsed = parseRoutesArray(
				node.declaration.expression,
				routesFileDir,
				warnings,
			)
			routes.push(...parsed)
		}

		// Handle NgModule pattern: RouterModule.forRoot([...]) or RouterModule.forChild([...])
		// This can appear in @NgModule decorator or as a call expression
		// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
		let classNode: any = null
		if (node.type === "ClassDeclaration") {
			classNode = node
		} else if (
			node.type === "ExportNamedDeclaration" &&
			// biome-ignore lint/suspicious/noExplicitAny: AST node types require type assertions
			(node as any).declaration?.type === "ClassDeclaration"
		) {
			// biome-ignore lint/suspicious/noExplicitAny: AST node types require type assertions
			classNode = (node as any).declaration
		}

		if (classNode) {
			const decorators = classNode.decorators || []
			for (const decorator of decorators) {
				if (decorator.expression?.type === "CallExpression") {
					const routesFromDecorator = extractRoutesFromNgModule(
						decorator.expression,
						routesFileDir,
						warnings,
					)
					routes.push(...routesFromDecorator)
				}
			}
		}

		// Handle standalone RouterModule.forRoot/forChild calls in exports
		if (node.type === "ExpressionStatement") {
			const routesFromExpr = extractRoutesFromExpression(
				node.expression,
				routesFileDir,
				warnings,
			)
			routes.push(...routesFromExpr)
		}
	}

	// Warn if no routes were found
	if (routes.length === 0) {
		warnings.push({
			type: "general",
			message:
				"No routes found. Supported patterns: 'export const routes: Routes = [...]', 'RouterModule.forRoot([...])', or 'RouterModule.forChild([...])'",
		})
	}

	return { routes, warnings }
}

/**
 * Extract routes from @NgModule decorator
 */
function extractRoutesFromNgModule(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	callExpr: any,
	baseDir: string,
	warnings: ParseWarning[],
): ParsedRoute[] {
	const routes: ParsedRoute[] = []

	// Check if it's @NgModule({...})
	if (
		callExpr.callee?.type === "Identifier" &&
		callExpr.callee.name === "NgModule"
	) {
		const arg = callExpr.arguments[0]
		if (arg?.type === "ObjectExpression") {
			for (const prop of arg.properties) {
				if (
					prop.type === "ObjectProperty" &&
					prop.key?.type === "Identifier" &&
					prop.key.name === "imports"
				) {
					if (prop.value?.type === "ArrayExpression") {
						for (const element of prop.value.elements) {
							if (!element) continue
							const extracted = extractRoutesFromExpression(
								element,
								baseDir,
								warnings,
							)
							routes.push(...extracted)
						}
					}
				}
			}
		}
	}

	return routes
}

/**
 * Extract routes from RouterModule.forRoot/forChild call expressions
 */
function extractRoutesFromExpression(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	node: any,
	baseDir: string,
	warnings: ParseWarning[],
): ParsedRoute[] {
	const routes: ParsedRoute[] = []

	if (node?.type !== "CallExpression") return routes

	const callee = node.callee
	if (
		callee?.type === "MemberExpression" &&
		callee.object?.type === "Identifier" &&
		callee.object.name === "RouterModule" &&
		callee.property?.type === "Identifier" &&
		(callee.property.name === "forRoot" || callee.property.name === "forChild")
	) {
		const routesArg = node.arguments[0]
		if (routesArg?.type === "ArrayExpression") {
			const parsed = parseRoutesArray(routesArg, baseDir, warnings)
			routes.push(...parsed)
		}
	}

	return routes
}

/**
 * Parse an array expression containing route objects
 */
function parseRoutesArray(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	arrayNode: any,
	baseDir: string,
	warnings: ParseWarning[],
): ParsedRoute[] {
	const routes: ParsedRoute[] = []

	for (const element of arrayNode.elements) {
		if (!element) continue

		// Handle spread elements
		if (element.type === "SpreadElement") {
			const line = element.loc?.start.line
			const variableName =
				element.argument?.type === "Identifier"
					? element.argument.name
					: undefined

			warnings.push({
				type: "spread",
				message: `Spread operator detected${line ? ` at line ${line}` : ""}`,
				line,
				variableName,
			})
			continue
		}

		if (element.type === "ObjectExpression") {
			const parsedRoute = parseRouteObject(element, baseDir, warnings)
			if (parsedRoute) {
				routes.push(parsedRoute)
			}
		} else {
			const line = element.loc?.start.line
			warnings.push({
				type: "general",
				message: `Non-object route element (${element.type})${line ? ` at line ${line}` : ""}. Only object literals can be statically analyzed.`,
				line,
			})
		}
	}

	return routes
}

/**
 * Parse a single route object expression
 */
function parseRouteObject(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	objectNode: any,
	baseDir: string,
	warnings: ParseWarning[],
): ParsedRoute | null {
	let path: string | undefined
	let component: string | undefined
	let children: ParsedRoute[] | undefined
	let redirectTo: string | undefined
	let hasPath = false

	for (const prop of objectNode.properties) {
		if (prop.type !== "ObjectProperty") continue
		if (prop.key.type !== "Identifier") continue

		const key = prop.key.name

		switch (key) {
			case "path":
				if (prop.value.type === "StringLiteral") {
					path = prop.value.value
					hasPath = true
				} else {
					const line = prop.loc?.start.line
					warnings.push({
						type: "general",
						message: `Dynamic path value (${prop.value.type})${line ? ` at line ${line}` : ""}. Only string literal paths can be statically analyzed.`,
						line,
					})
				}
				break

			case "component":
				// Direct component reference: component: HomeComponent
				if (prop.value.type === "Identifier") {
					component = prop.value.name
				}
				break

			case "loadComponent":
				// Lazy component: loadComponent: () => import('./path').then(m => m.Component)
				component = extractLazyComponent(prop.value, baseDir, warnings)
				break

			case "loadChildren": {
				// Lazy children: loadChildren: () => import('./path').then(m => m.routes)
				// We just note this for now - the actual routes are in another file
				const lazyPath = extractLazyPath(prop.value, baseDir, warnings)
				if (lazyPath) {
					component = `[lazy: ${lazyPath}]`
				}
				break
			}

			case "children":
				if (prop.value.type === "ArrayExpression") {
					children = parseRoutesArray(prop.value, baseDir, warnings)
				}
				break

			case "redirectTo":
				if (prop.value.type === "StringLiteral") {
					redirectTo = prop.value.value
				}
				break

			// Skip these properties (not relevant for screen detection)
			case "pathMatch":
			case "canActivate":
			case "canDeactivate":
			case "canMatch":
			case "resolve":
			case "data":
			case "title":
			case "providers":
			case "runGuardsAndResolvers":
			case "outlet":
				break
		}
	}

	// Skip redirect-only routes (no component)
	if (redirectTo && !component && !children) {
		return null
	}

	// Skip routes without path (unless they have children for layout purposes)
	if (!hasPath) {
		if (children && children.length > 0) {
			return { path: "", component, children }
		}
		return null
	}

	return {
		path: path || "",
		component,
		children,
	}
}

/**
 * Extract component from lazy loadComponent pattern
 * loadComponent: () => import('./path').then(m => m.Component)
 */
function extractLazyComponent(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	node: any,
	baseDir: string,
	warnings: ParseWarning[],
): string | undefined {
	// Arrow function: () => import('./path').then(m => m.Component)
	if (node.type === "ArrowFunctionExpression") {
		const body = node.body

		// Handle .then(m => m.Component) chain
		if (
			body.type === "CallExpression" &&
			body.callee?.type === "MemberExpression" &&
			body.callee.property?.type === "Identifier" &&
			body.callee.property.name === "then"
		) {
			const importCall = body.callee.object
			const thenArg = body.arguments[0]

			// Check if it's an import() call
			if (
				importCall?.type === "CallExpression" &&
				importCall.callee?.type === "Import"
			) {
				// Check if the argument is a string literal
				if (importCall.arguments[0]?.type === "StringLiteral") {
					const importPath = resolveImportPath(
						importCall.arguments[0].value,
						baseDir,
					)

					// Extract component name from .then(m => m.Component)
					if (
						thenArg?.type === "ArrowFunctionExpression" &&
						thenArg.body?.type === "MemberExpression" &&
						thenArg.body.property?.type === "Identifier"
					) {
						return `${importPath}#${thenArg.body.property.name}`
					}

					return importPath
				}
				// Dynamic import path - warn the user
				const line = node.loc?.start.line
				warnings.push({
					type: "general",
					message: `Lazy loadComponent with dynamic path${line ? ` at line ${line}` : ""}. Only string literal imports can be analyzed.`,
					line,
				})
				return undefined
			}
		}

		// Direct import without .then(): () => import('./path')
		if (body.type === "CallExpression" && body.callee?.type === "Import") {
			if (body.arguments[0]?.type === "StringLiteral") {
				return resolveImportPath(body.arguments[0].value, baseDir)
			}
			const line = node.loc?.start.line
			warnings.push({
				type: "general",
				message: `Lazy loadComponent with dynamic path${line ? ` at line ${line}` : ""}. Only string literal imports can be analyzed.`,
				line,
			})
			return undefined
		}
	}

	const line = node.loc?.start.line
	warnings.push({
		type: "general",
		message: `Unrecognized loadComponent pattern (${node.type})${line ? ` at line ${line}` : ""}. Expected arrow function with import().then().`,
		line,
	})
	return undefined
}

/**
 * Extract path from lazy loadChildren pattern
 * loadChildren: () => import('./path').then(m => m.routes)
 */
function extractLazyPath(
	// biome-ignore lint/suspicious/noExplicitAny: AST node types are complex
	node: any,
	baseDir: string,
	warnings: ParseWarning[],
): string | undefined {
	if (node.type === "ArrowFunctionExpression") {
		const body = node.body

		// Handle .then() chain
		if (
			body.type === "CallExpression" &&
			body.callee?.type === "MemberExpression" &&
			body.callee.property?.type === "Identifier" &&
			body.callee.property.name === "then"
		) {
			const importCall = body.callee.object
			if (
				importCall?.type === "CallExpression" &&
				importCall.callee?.type === "Import" &&
				importCall.arguments[0]?.type === "StringLiteral"
			) {
				return resolveImportPath(importCall.arguments[0].value, baseDir)
			}
		}

		// Direct import without .then()
		if (body.type === "CallExpression" && body.callee?.type === "Import") {
			if (body.arguments[0]?.type === "StringLiteral") {
				return resolveImportPath(body.arguments[0].value, baseDir)
			}
		}
	}

	const line = node.loc?.start.line
	warnings.push({
		type: "general",
		message: `Unrecognized loadChildren pattern (${node.type})${line ? ` at line ${line}` : ""}. Expected arrow function with import().`,
		line,
	})
	return undefined
}

/**
 * Detect if content is Angular Router based on patterns.
 * Checks for @angular/router import, RouterModule patterns, or Routes type annotation.
 */
export function isAngularRouterContent(content: string): boolean {
	// Check for Angular Router import
	if (content.includes("@angular/router")) {
		return true
	}

	// Check for RouterModule patterns
	if (
		content.includes("RouterModule.forRoot") ||
		content.includes("RouterModule.forChild")
	) {
		return true
	}

	// Check for Routes type annotation: : Routes = or : Routes[
	if (/:\s*Routes\s*[=[]/.test(content)) {
		return true
	}

	return false
}
