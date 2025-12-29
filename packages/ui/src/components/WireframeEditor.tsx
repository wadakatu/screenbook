import { Tldraw, createShapeId, type Editor } from "tldraw"
import "tldraw/tldraw.css"
import { useCallback, useState } from "react"

interface WireframeEditorProps {
	screenId?: string
	screenTitle?: string
}

export function WireframeEditor({ screenId, screenTitle }: WireframeEditorProps) {
	const [editor, setEditor] = useState<Editor | null>(null)

	const handleMount = useCallback((editor: Editor) => {
		setEditor(editor)

		// Add some initial shapes for demo
		if (screenTitle) {
			// Create a frame for the screen
			const frameId = createShapeId()
			editor.createShape({
				id: frameId,
				type: "frame",
				x: 100,
				y: 100,
				props: {
					w: 375,
					h: 667,
					name: screenTitle,
				},
			})

			// Add a sample button (rectangle with text)
			editor.createShape({
				type: "geo",
				x: 120,
				y: 130,
				props: {
					geo: "rectangle",
					w: 335,
					h: 44,
					fill: "solid",
					color: "light-green",
				},
			})

			// Add button label
			editor.createShape({
				type: "geo",
				x: 120,
				y: 200,
				props: {
					geo: "rectangle",
					w: 335,
					h: 44,
					fill: "none",
					color: "grey",
				},
			})

			// Add another button
			editor.createShape({
				type: "geo",
				x: 120,
				y: 270,
				props: {
					geo: "rectangle",
					w: 335,
					h: 44,
					fill: "solid",
					color: "grey",
				},
			})

			// Add image placeholder
			editor.createShape({
				type: "geo",
				x: 120,
				y: 340,
				props: {
					geo: "rectangle",
					w: 335,
					h: 200,
					fill: "pattern",
					color: "grey",
					dash: "dashed",
				},
			})

			// Zoom to fit
			editor.zoomToFit()
		}
	}, [screenTitle])

	const handleExport = useCallback(() => {
		if (!editor) return

		const shapes = editor.getCurrentPageShapes()
		const exportData = shapes.map((shape) => ({
			id: shape.id,
			type: shape.type,
			x: shape.x,
			y: shape.y,
			props: shape.props,
		}))

		console.log("Export data:", JSON.stringify(exportData, null, 2))
		alert("Canvas data exported to console. Check DevTools.")
	}, [editor])

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
			<div
				style={{
					padding: "12px 16px",
					background: "#1a1f2e",
					borderBottom: "1px solid #2d3548",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "16px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
					<span style={{ color: "#94a3b8", fontSize: "14px" }}>
						Wireframe Editor
					</span>
					{screenId && (
						<span
							style={{
								background: "#14b8a6",
								color: "white",
								padding: "2px 8px",
								borderRadius: "4px",
								fontSize: "12px",
								fontWeight: 500,
							}}
						>
							{screenId}
						</span>
					)}
				</div>
				<div style={{ display: "flex", gap: "8px" }}>
					<button
						onClick={handleExport}
						style={{
							background: "#2d3548",
							color: "#94a3b8",
							border: "1px solid #3d4660",
							padding: "6px 12px",
							borderRadius: "6px",
							fontSize: "13px",
							cursor: "pointer",
						}}
					>
						Export JSON
					</button>
					<button
						style={{
							background: "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
							color: "white",
							border: "none",
							padding: "6px 12px",
							borderRadius: "6px",
							fontSize: "13px",
							fontWeight: 500,
							cursor: "pointer",
						}}
					>
						Save to screen.meta.ts
					</button>
				</div>
			</div>
			<div style={{ flex: 1, position: "relative" }}>
				<Tldraw
					onMount={handleMount}
					inferDarkMode
				/>
			</div>
		</div>
	)
}
