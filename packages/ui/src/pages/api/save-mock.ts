import type { APIRoute } from "astro"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { Project, SyntaxKind } from "ts-morph"

interface ScreenWithFilePath {
	id: string
	filePath: string
	[key: string]: unknown
}

interface SaveMockRequest {
	screenId: string
	mock: {
		sections: Array<{
			title?: string
			layout?: string
			elements: Array<Record<string, unknown>>
		}>
	}
}

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = (await request.json()) as SaveMockRequest
		const { screenId, mock } = body

		if (!screenId || !mock) {
			return new Response(
				JSON.stringify({ error: "screenId and mock are required" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			)
		}

		// Load screens.json to get filePath
		const screensPath = join(process.cwd(), ".screenbook", "screens.json")
		if (!existsSync(screensPath)) {
			return new Response(
				JSON.stringify({ error: "screens.json not found. Run screenbook build first." }),
				{ status: 404, headers: { "Content-Type": "application/json" } },
			)
		}

		const screens = JSON.parse(readFileSync(screensPath, "utf-8")) as ScreenWithFilePath[]
		const screen = screens.find((s) => s.id === screenId)

		if (!screen) {
			return new Response(
				JSON.stringify({ error: `Screen '${screenId}' not found` }),
				{ status: 404, headers: { "Content-Type": "application/json" } },
			)
		}

		if (!screen.filePath) {
			return new Response(
				JSON.stringify({ error: `Screen '${screenId}' does not have filePath. Rebuild with latest CLI.` }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			)
		}

		// Use ts-morph to update the file
		const result = await updateMockInFile(screen.filePath, mock)

		if (!result.success) {
			return new Response(
				JSON.stringify({ error: result.error }),
				{ status: 500, headers: { "Content-Type": "application/json" } },
			)
		}

		return new Response(
			JSON.stringify({ success: true, filePath: screen.filePath }),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		)
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error"
		return new Response(
			JSON.stringify({ error: message }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		)
	}
}

async function updateMockInFile(
	filePath: string,
	mock: SaveMockRequest["mock"],
): Promise<{ success: boolean; error?: string }> {
	try {
		const project = new Project()
		const sourceFile = project.addSourceFileAtPath(filePath)

		// Find the defineScreen call
		const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
		const defineScreenCall = callExpressions.find((call) => {
			const expression = call.getExpression()
			return expression.getText() === "defineScreen"
		})

		if (!defineScreenCall) {
			return { success: false, error: "defineScreen() call not found in file" }
		}

		// Get the object literal argument
		const args = defineScreenCall.getArguments()
		if (args.length === 0) {
			return { success: false, error: "defineScreen() has no arguments" }
		}

		const objectLiteral = args[0]
		if (objectLiteral.getKind() !== SyntaxKind.ObjectLiteralExpression) {
			return { success: false, error: "defineScreen() argument is not an object literal" }
		}

		const obj = objectLiteral.asKind(SyntaxKind.ObjectLiteralExpression)
		if (!obj) {
			return { success: false, error: "Failed to parse object literal" }
		}

		// Find existing mock property
		const mockProperty = obj.getProperty("mock")

		// Generate mock code string
		const mockCode = generateMockCode(mock)

		if (mockProperty) {
			// Update existing mock property
			mockProperty.replaceWithText(`mock: ${mockCode}`)
		} else {
			// Add new mock property at the end
			obj.addPropertyAssignment({
				name: "mock",
				initializer: mockCode,
			})
		}

		// Save the file
		await sourceFile.save()

		return { success: true }
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error"
		return { success: false, error: message }
	}
}

function generateMockCode(mock: SaveMockRequest["mock"]): string {
	const sections = mock.sections.map((section) => {
		const props: string[] = []

		if (section.title) {
			props.push(`title: ${JSON.stringify(section.title)}`)
		}
		if (section.layout && section.layout !== "vertical") {
			props.push(`layout: ${JSON.stringify(section.layout)}`)
		}

		const elements = section.elements.map((element) => {
			const elementProps = Object.entries(element)
				.filter(([_, value]) => value !== undefined && value !== "")
				.map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
				.join(", ")
			return `{ ${elementProps} }`
		})

		props.push(`elements: [\n\t\t\t${elements.join(",\n\t\t\t")},\n\t\t]`)

		return `{\n\t\t${props.join(",\n\t\t")},\n\t}`
	})

	return `{\n\tsections: [\n\t${sections.join(",\n\t")},\n\t],\n}`
}
