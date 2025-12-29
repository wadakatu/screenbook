import type {
	MockElement,
	MockLayout,
	MockSection,
	ScreenMock,
} from "@screenbook/core"
import { useCallback, useState } from "react"

interface MockFormEditorProps {
	screenId?: string
	screenTitle?: string
	initialMock?: ScreenMock
}

type ElementType =
	| "button"
	| "input"
	| "link"
	| "text"
	| "image"
	| "list"
	| "table"

const ELEMENT_TYPES: { value: ElementType; label: string }[] = [
	{ value: "button", label: "Button" },
	{ value: "input", label: "Input" },
	{ value: "link", label: "Link" },
	{ value: "text", label: "Text" },
	{ value: "image", label: "Image" },
	{ value: "list", label: "List" },
	{ value: "table", label: "Table" },
]

// Template definitions for quick-start mock creation
const TEMPLATES: { id: string; label: string; sections: MockSection[] }[] = [
	{
		id: "basic-form",
		label: "Basic Form",
		sections: [
			{
				title: "Header",
				layout: "horizontal",
				elements: [{ type: "text", label: "Page Title", variant: "heading" }],
			},
			{
				title: "Form",
				elements: [
					{ type: "input", label: "Name", placeholder: "Enter name..." },
					{
						type: "input",
						label: "Email",
						inputType: "email",
						placeholder: "Enter email...",
					},
					{
						type: "input",
						label: "Message",
						inputType: "textarea",
						placeholder: "Enter message...",
					},
				],
			},
			{
				title: "Actions",
				layout: "horizontal",
				elements: [
					{ type: "link", label: "Cancel" },
					{ type: "button", label: "Submit", variant: "primary" },
				],
			},
		],
	},
	{
		id: "list-view",
		label: "List View",
		sections: [
			{
				title: "Header",
				layout: "horizontal",
				elements: [
					{ type: "text", label: "Items", variant: "heading" },
					{ type: "button", label: "Add New", variant: "primary" },
				],
			},
			{
				title: "Search",
				elements: [
					{
						type: "input",
						label: "Search",
						inputType: "search",
						placeholder: "Search items...",
					},
				],
			},
			{
				title: "Content",
				elements: [{ type: "list", label: "Item List", itemCount: 5 }],
			},
		],
	},
	{
		id: "detail-view",
		label: "Detail View",
		sections: [
			{
				title: "Header",
				layout: "horizontal",
				elements: [
					{ type: "text", label: "Item Detail", variant: "heading" },
					{ type: "button", label: "Edit", variant: "secondary" },
					{ type: "button", label: "Delete", variant: "danger" },
				],
			},
			{
				title: "Info",
				elements: [
					{ type: "text", label: "Name: Example Item", variant: "body" },
					{ type: "text", label: "Created: 2024-01-01", variant: "caption" },
					{ type: "image", label: "Item Image", aspectRatio: "16:9" },
				],
			},
			{
				title: "Actions",
				layout: "horizontal",
				elements: [{ type: "link", label: "Back to List" }],
			},
		],
	},
	{
		id: "dashboard",
		label: "Dashboard",
		sections: [
			{
				title: "Header",
				layout: "horizontal",
				elements: [{ type: "text", label: "Dashboard", variant: "heading" }],
			},
			{
				title: "Stats",
				layout: "horizontal",
				elements: [
					{ type: "text", label: "Total: 100", variant: "subheading" },
					{ type: "text", label: "Active: 80", variant: "subheading" },
					{ type: "text", label: "Pending: 20", variant: "subheading" },
				],
			},
			{
				title: "Data",
				elements: [
					{
						type: "table",
						label: "Recent Items",
						columns: ["Name", "Status", "Date"],
						rowCount: 5,
					},
				],
			},
		],
	},
	{
		id: "settings",
		label: "Settings",
		sections: [
			{
				title: "Header",
				elements: [{ type: "text", label: "Settings", variant: "heading" }],
			},
			{
				title: "Profile",
				elements: [
					{ type: "image", label: "Avatar", aspectRatio: "1:1" },
					{ type: "input", label: "Display Name", placeholder: "Your name" },
					{
						type: "input",
						label: "Email",
						inputType: "email",
						placeholder: "your@email.com",
					},
				],
			},
			{
				title: "Preferences",
				elements: [
					{ type: "input", label: "Language", placeholder: "Select language" },
					{ type: "input", label: "Timezone", placeholder: "Select timezone" },
				],
			},
			{
				title: "Actions",
				layout: "horizontal",
				elements: [
					{ type: "button", label: "Save Changes", variant: "primary" },
				],
			},
		],
	},
]

function createDefaultElement(type: ElementType): MockElement {
	switch (type) {
		case "button":
			return { type: "button", label: "Button", variant: "secondary" }
		case "input":
			return { type: "input", label: "Input", placeholder: "Enter text..." }
		case "link":
			return { type: "link", label: "Link" }
		case "text":
			return { type: "text", label: "Text content", variant: "body" }
		case "image":
			return { type: "image", label: "Image", aspectRatio: "16:9" }
		case "list":
			return { type: "list", label: "List", itemCount: 3 }
		case "table":
			return {
				type: "table",
				label: "Table",
				columns: ["Col 1", "Col 2", "Col 3"],
				rowCount: 3,
			}
	}
}

// Helper to update a section at a given path (e.g., [0, 1] = sections[0].children[1])
function updateSectionAtPath(
	sections: MockSection[],
	path: number[],
	updater: (section: MockSection) => MockSection,
): MockSection[] {
	if (path.length === 0) return sections

	const [index, ...rest] = path

	return sections.map((section, i) => {
		if (i !== index) return section

		if (rest.length === 0) {
			return updater(section)
		}

		return {
			...section,
			children: updateSectionAtPath(section.children || [], rest, updater),
		}
	})
}

// Helper to remove a section at a given path
function removeSectionAtPath(
	sections: MockSection[],
	path: number[],
): MockSection[] {
	if (path.length === 0) return sections

	const [index, ...rest] = path

	if (rest.length === 0) {
		return sections.filter((_, i) => i !== index)
	}

	return sections.map((section, i) => {
		if (i !== index) return section
		return {
			...section,
			children: removeSectionAtPath(section.children || [], rest),
		}
	})
}

// Helper to add a child section at a given path
function addChildSectionAtPath(
	sections: MockSection[],
	path: number[],
): MockSection[] {
	return updateSectionAtPath(sections, path, (section) => ({
		...section,
		children: [
			...(section.children || []),
			{ title: "Child Section", elements: [] },
		],
	}))
}

export function MockFormEditor({
	screenId,
	screenTitle,
	initialMock,
}: MockFormEditorProps) {
	const [sections, setSections] = useState<MockSection[]>(
		initialMock?.sections || [
			{ title: "Header", layout: "horizontal", elements: [] },
		],
	)
	const [saveStatus, setSaveStatus] = useState<
		"idle" | "saving" | "saved" | "error"
	>("idle")
	const [saveError, setSaveError] = useState<string | null>(null)

	const addSection = useCallback(() => {
		setSections((prev) => [...prev, { title: "New Section", elements: [] }])
	}, [])

	const applyTemplate = useCallback((templateId: string) => {
		const template = TEMPLATES.find((t) => t.id === templateId)
		if (template) {
			// Deep clone the template sections to avoid mutation
			setSections(JSON.parse(JSON.stringify(template.sections)))
		}
	}, [])

	// Path-based section operations
	const updateSectionByPath = useCallback(
		(path: number[], updates: Partial<MockSection>) => {
			setSections((prev) =>
				updateSectionAtPath(prev, path, (section) => ({
					...section,
					...updates,
				})),
			)
		},
		[],
	)

	const removeSectionByPath = useCallback((path: number[]) => {
		setSections((prev) => removeSectionAtPath(prev, path))
	}, [])

	const addChildSection = useCallback((path: number[]) => {
		setSections((prev) => addChildSectionAtPath(prev, path))
	}, [])

	const addElementByPath = useCallback((path: number[], type: ElementType) => {
		setSections((prev) =>
			updateSectionAtPath(prev, path, (section) => ({
				...section,
				elements: [...section.elements, createDefaultElement(type)],
			})),
		)
	}, [])

	const removeElementByPath = useCallback(
		(path: number[], elementIndex: number) => {
			setSections((prev) =>
				updateSectionAtPath(prev, path, (section) => ({
					...section,
					elements: section.elements.filter((_, j) => j !== elementIndex),
				})),
			)
		},
		[],
	)

	const updateElementByPath = useCallback(
		(path: number[], elementIndex: number, updates: Partial<MockElement>) => {
			setSections((prev) =>
				updateSectionAtPath(prev, path, (section) => ({
					...section,
					elements: section.elements.map((el, j) =>
						j === elementIndex ? ({ ...el, ...updates } as MockElement) : el,
					),
				})),
			)
		},
		[],
	)

	const exportMock = useCallback(() => {
		const mock: ScreenMock = { sections }
		const code = `mock: ${JSON.stringify(mock, null, 2)}`
		console.log(code)
		void window.navigator.clipboard.writeText(code)
		window.alert("Copied to clipboard!")
	}, [sections])

	const saveMock = useCallback(async () => {
		if (!screenId) {
			window.alert(
				"Cannot save: No screen ID. Use 'Export Code' to copy to clipboard.",
			)
			return
		}

		setSaveStatus("saving")
		setSaveError(null)

		try {
			const response = await fetch("/api/save-mock", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					screenId,
					mock: { sections },
				}),
			})

			const result = (await response.json()) as { error?: string }

			if (!response.ok) {
				throw new Error(result.error || "Failed to save")
			}

			setSaveStatus("saved")
			setTimeout(() => setSaveStatus("idle"), 2000)
		} catch (error) {
			setSaveStatus("error")
			setSaveError(error instanceof Error ? error.message : "Unknown error")
		}
	}, [screenId, sections])

	return (
		<div style={{ display: "flex", height: "100%", background: "#141822" }}>
			{/* Left Panel - Form Editor */}
			<div
				style={{
					width: "50%",
					borderRight: "1px solid #2d3548",
					overflow: "auto",
				}}
			>
				<div style={{ padding: "16px", borderBottom: "1px solid #2d3548" }}>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
							<span
								style={{ color: "#e2e8f0", fontSize: "16px", fontWeight: 600 }}
							>
								Mock Editor
							</span>
							{screenId && (
								<span
									style={{
										background: "#14b8a6",
										color: "white",
										padding: "2px 8px",
										borderRadius: "4px",
										fontSize: "12px",
									}}
								>
									{screenId}
								</span>
							)}
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<select
								onChange={(e) => {
									if (e.target.value) {
										applyTemplate(e.target.value)
										e.target.value = ""
									}
								}}
								defaultValue=""
								style={{
									background: "#2d3548",
									border: "1px solid #3d4660",
									borderRadius: "6px",
									padding: "8px 12px",
									color: "#94a3b8",
									fontSize: "13px",
									cursor: "pointer",
								}}
							>
								<option value="" disabled>
									Templates
								</option>
								{TEMPLATES.map((template) => (
									<option key={template.id} value={template.id}>
										{template.label}
									</option>
								))}
							</select>
							{saveStatus === "error" && (
								<span style={{ color: "#ef4444", fontSize: "12px" }}>
									{saveError}
								</span>
							)}
							{saveStatus === "saved" && (
								<span style={{ color: "#22c55e", fontSize: "12px" }}>
									Saved!
								</span>
							)}
							<button
								type="button"
								onClick={exportMock}
								style={{
									background: "#2d3548",
									color: "#94a3b8",
									border: "1px solid #3d4660",
									padding: "8px 16px",
									borderRadius: "6px",
									fontSize: "13px",
									fontWeight: 500,
									cursor: "pointer",
								}}
							>
								Copy Code
							</button>
							<button
								type="button"
								onClick={saveMock}
								disabled={saveStatus === "saving" || !screenId}
								style={{
									background:
										saveStatus === "saving"
											? "#2d3548"
											: "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
									color: saveStatus === "saving" ? "#64748b" : "white",
									border: "none",
									padding: "8px 16px",
									borderRadius: "6px",
									fontSize: "13px",
									fontWeight: 500,
									cursor:
										saveStatus === "saving" || !screenId
											? "not-allowed"
											: "pointer",
									opacity: !screenId ? 0.5 : 1,
								}}
								title={!screenId ? "Save requires a screen ID" : undefined}
							>
								{saveStatus === "saving" ? "Saving..." : "Save to File"}
							</button>
						</div>
					</div>
				</div>

				<div style={{ padding: "16px" }}>
					{sections.map((section, sectionIndex) => (
						<SectionEditor
							key={sectionIndex}
							section={section}
							path={[sectionIndex]}
							depth={0}
							onUpdate={updateSectionByPath}
							onRemove={removeSectionByPath}
							onAddChild={addChildSection}
							onAddElement={addElementByPath}
							onRemoveElement={removeElementByPath}
							onUpdateElement={updateElementByPath}
						/>
					))}

					<button
						type="button"
						onClick={addSection}
						style={{
							width: "100%",
							background: "#2d3548",
							border: "1px dashed #3d4660",
							borderRadius: "8px",
							padding: "12px",
							color: "#94a3b8",
							fontSize: "13px",
							cursor: "pointer",
						}}
					>
						+ Add Section
					</button>
				</div>
			</div>

			{/* Right Panel - Preview */}
			<div style={{ width: "50%", overflow: "auto", padding: "24px" }}>
				<div
					style={{
						color: "#64748b",
						fontSize: "12px",
						marginBottom: "12px",
						textTransform: "uppercase",
						letterSpacing: "0.05em",
					}}
				>
					Live Preview
				</div>
				<MockPreview sections={sections} title={screenTitle} />
			</div>
		</div>
	)
}

// Section Editor Component (recursive for child sections)
function SectionEditor({
	section,
	path,
	depth,
	onUpdate,
	onRemove,
	onAddChild,
	onAddElement,
	onRemoveElement,
	onUpdateElement,
}: {
	section: MockSection
	path: number[]
	depth: number
	onUpdate: (path: number[], updates: Partial<MockSection>) => void
	onRemove: (path: number[]) => void
	onAddChild: (path: number[]) => void
	onAddElement: (path: number[], type: ElementType) => void
	onRemoveElement: (path: number[], elementIndex: number) => void
	onUpdateElement: (
		path: number[],
		elementIndex: number,
		updates: Partial<MockElement>,
	) => void
}) {
	const indentPx = depth * 16

	return (
		<div
			style={{
				marginBottom: "12px",
				marginLeft: `${indentPx}px`,
				borderLeft: depth > 0 ? "2px solid #3d4660" : undefined,
				paddingLeft: depth > 0 ? "12px" : undefined,
			}}
		>
			<div
				style={{
					background: "#1e2433",
					borderRadius: "8px",
					overflow: "hidden",
				}}
			>
				{/* Section Header */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						padding: "10px 12px",
						background: "#252d40",
						borderBottom: "1px solid #2d3548",
					}}
				>
					<input
						type="text"
						value={section.title || ""}
						onChange={(e) => onUpdate(path, { title: e.target.value })}
						placeholder="Section title"
						style={{
							flex: 1,
							background: "#1e2433",
							border: "1px solid #2d3548",
							borderRadius: "4px",
							padding: "6px 8px",
							color: "#e2e8f0",
							fontSize: "13px",
						}}
					/>
					<select
						value={section.layout || "vertical"}
						onChange={(e) =>
							onUpdate(path, { layout: e.target.value as MockLayout })
						}
						style={{
							background: "#1e2433",
							border: "1px solid #2d3548",
							borderRadius: "4px",
							padding: "6px 8px",
							color: "#94a3b8",
							fontSize: "12px",
						}}
					>
						<option value="vertical">Vertical</option>
						<option value="horizontal">Horizontal</option>
						<option value="grid">Grid</option>
					</select>
					{depth > 0 && (
						<span
							style={{
								fontSize: "10px",
								color: "#64748b",
								padding: "2px 6px",
								background: "#1e2433",
								borderRadius: "4px",
							}}
						>
							L{depth}
						</span>
					)}
					<button
						type="button"
						onClick={() => onRemove(path)}
						style={{
							background: "transparent",
							border: "none",
							color: "#ef4444",
							cursor: "pointer",
							fontSize: "16px",
							padding: "0 4px",
						}}
					>
						×
					</button>
				</div>

				{/* Elements */}
				<div style={{ padding: "12px" }}>
					{section.elements.map((element, elementIndex) => (
						<ElementEditor
							key={elementIndex}
							element={element}
							onChange={(updates) =>
								onUpdateElement(path, elementIndex, updates)
							}
							onRemove={() => onRemoveElement(path, elementIndex)}
						/>
					))}

					{section.elements.length === 0 && (
						<div
							style={{
								color: "#475569",
								fontSize: "12px",
								fontStyle: "italic",
								padding: "8px 0",
							}}
						>
							No elements yet
						</div>
					)}

					{/* Add Element Buttons */}
					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							gap: "4px",
							marginTop: "8px",
						}}
					>
						{ELEMENT_TYPES.map((type) => (
							<button
								key={type.value}
								type="button"
								onClick={() => onAddElement(path, type.value)}
								style={{
									background: "#2d3548",
									border: "1px solid #3d4660",
									borderRadius: "4px",
									padding: "4px 8px",
									color: "#94a3b8",
									fontSize: "11px",
									cursor: "pointer",
								}}
							>
								+ {type.label}
							</button>
						))}
					</div>
				</div>

				{/* Add Child Section Button */}
				<div
					style={{
						padding: "8px 12px",
						borderTop: "1px solid #2d3548",
					}}
				>
					<button
						type="button"
						onClick={() => onAddChild(path)}
						style={{
							background: "transparent",
							border: "1px dashed #3d4660",
							borderRadius: "4px",
							padding: "6px 12px",
							color: "#64748b",
							fontSize: "11px",
							cursor: "pointer",
							width: "100%",
						}}
					>
						+ Add Child Section
					</button>
				</div>
			</div>

			{/* Render Child Sections Recursively */}
			{section.children && section.children.length > 0 && (
				<div style={{ marginTop: "8px" }}>
					{section.children.map((childSection, childIndex) => (
						<SectionEditor
							key={childIndex}
							section={childSection}
							path={[...path, childIndex]}
							depth={depth + 1}
							onUpdate={onUpdate}
							onRemove={onRemove}
							onAddChild={onAddChild}
							onAddElement={onAddElement}
							onRemoveElement={onRemoveElement}
							onUpdateElement={onUpdateElement}
						/>
					))}
				</div>
			)}
		</div>
	)
}

// Element Editor Component
function ElementEditor({
	element,
	onChange,
	onRemove,
}: {
	element: MockElement
	onChange: (updates: Partial<MockElement>) => void
	onRemove: () => void
}) {
	const typeColors: Record<string, string> = {
		button: "#14b8a6",
		input: "#6366f1",
		link: "#8b5cf6",
		text: "#64748b",
		image: "#f59e0b",
		list: "#ec4899",
		table: "#06b6d4",
	}

	return (
		<div
			style={{
				background: "#141822",
				borderRadius: "6px",
				padding: "10px",
				marginBottom: "8px",
				borderLeft: `3px solid ${typeColors[element.type] || "#64748b"}`,
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					marginBottom: "8px",
				}}
			>
				<span
					style={{
						fontSize: "10px",
						fontWeight: 600,
						color: typeColors[element.type],
						textTransform: "uppercase",
					}}
				>
					{element.type}
				</span>
				<div style={{ flex: 1 }} />
				<button
					type="button"
					onClick={onRemove}
					style={{
						background: "transparent",
						border: "none",
						color: "#ef4444",
						cursor: "pointer",
						fontSize: "14px",
					}}
				>
					×
				</button>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
				<input
					type="text"
					value={element.label}
					onChange={(e) => onChange({ label: e.target.value })}
					placeholder="Label"
					style={{
						background: "#1e2433",
						border: "1px solid #2d3548",
						borderRadius: "4px",
						padding: "6px 8px",
						color: "#e2e8f0",
						fontSize: "12px",
					}}
				/>

				{element.type === "button" && (
					<select
						value={(element as any).variant || "secondary"}
						onChange={(e) => onChange({ variant: e.target.value as any })}
						style={{
							background: "#1e2433",
							border: "1px solid #2d3548",
							borderRadius: "4px",
							padding: "6px 8px",
							color: "#94a3b8",
							fontSize: "12px",
						}}
					>
						<option value="primary">Primary</option>
						<option value="secondary">Secondary</option>
						<option value="danger">Danger</option>
					</select>
				)}

				{element.type === "button" && (
					<input
						type="text"
						value={(element as any).navigateTo || ""}
						onChange={(e) =>
							onChange({ navigateTo: e.target.value || undefined })
						}
						placeholder="Navigate to (screen id)"
						style={{
							background: "#1e2433",
							border: "1px solid #2d3548",
							borderRadius: "4px",
							padding: "6px 8px",
							color: "#e2e8f0",
							fontSize: "12px",
						}}
					/>
				)}

				{element.type === "input" && (
					<>
						<select
							value={(element as any).inputType || "text"}
							onChange={(e) => onChange({ inputType: e.target.value as any })}
							style={{
								background: "#1e2433",
								border: "1px solid #2d3548",
								borderRadius: "4px",
								padding: "6px 8px",
								color: "#94a3b8",
								fontSize: "12px",
							}}
						>
							<option value="text">Text</option>
							<option value="email">Email</option>
							<option value="password">Password</option>
							<option value="textarea">Textarea</option>
							<option value="search">Search</option>
						</select>
						<input
							type="text"
							value={(element as any).placeholder || ""}
							onChange={(e) => onChange({ placeholder: e.target.value })}
							placeholder="Placeholder text"
							style={{
								background: "#1e2433",
								border: "1px solid #2d3548",
								borderRadius: "4px",
								padding: "6px 8px",
								color: "#e2e8f0",
								fontSize: "12px",
							}}
						/>
					</>
				)}

				{element.type === "text" && (
					<select
						value={(element as any).variant || "body"}
						onChange={(e) => onChange({ variant: e.target.value as any })}
						style={{
							background: "#1e2433",
							border: "1px solid #2d3548",
							borderRadius: "4px",
							padding: "6px 8px",
							color: "#94a3b8",
							fontSize: "12px",
						}}
					>
						<option value="heading">Heading</option>
						<option value="subheading">Subheading</option>
						<option value="body">Body</option>
						<option value="caption">Caption</option>
					</select>
				)}

				{element.type === "link" && (
					<input
						type="text"
						value={(element as any).navigateTo || ""}
						onChange={(e) =>
							onChange({ navigateTo: e.target.value || undefined })
						}
						placeholder="Navigate to (screen id)"
						style={{
							background: "#1e2433",
							border: "1px solid #2d3548",
							borderRadius: "4px",
							padding: "6px 8px",
							color: "#e2e8f0",
							fontSize: "12px",
						}}
					/>
				)}

				{element.type === "image" && (
					<select
						value={(element as any).aspectRatio || "16:9"}
						onChange={(e) => onChange({ aspectRatio: e.target.value })}
						style={{
							background: "#1e2433",
							border: "1px solid #2d3548",
							borderRadius: "4px",
							padding: "6px 8px",
							color: "#94a3b8",
							fontSize: "12px",
						}}
					>
						<option value="16:9">16:9</option>
						<option value="4:3">4:3</option>
						<option value="1:1">1:1</option>
						<option value="3:4">3:4</option>
					</select>
				)}

				{element.type === "list" && (
					<>
						<input
							type="number"
							value={(element as any).itemCount || 3}
							onChange={(e) =>
								onChange({ itemCount: parseInt(e.target.value, 10) || 3 })
							}
							placeholder="Item count"
							min={1}
							max={10}
							style={{
								background: "#1e2433",
								border: "1px solid #2d3548",
								borderRadius: "4px",
								padding: "6px 8px",
								color: "#e2e8f0",
								fontSize: "12px",
								width: "80px",
							}}
						/>
						<input
							type="text"
							value={(element as any).itemNavigateTo || ""}
							onChange={(e) =>
								onChange({ itemNavigateTo: e.target.value || undefined })
							}
							placeholder="Navigate to screen..."
							style={{
								background: "#1e2433",
								border: "1px solid #2d3548",
								borderRadius: "4px",
								padding: "6px 8px",
								color: "#e2e8f0",
								fontSize: "12px",
								flex: 1,
							}}
						/>
					</>
				)}

				{element.type === "table" && (
					<>
						<input
							type="text"
							value={(element as any).columns?.join(", ") || ""}
							onChange={(e) =>
								onChange({
									columns: e.target.value
										.split(",")
										.map((s: string) => s.trim())
										.filter(Boolean),
								})
							}
							placeholder="Columns (comma separated)"
							style={{
								background: "#1e2433",
								border: "1px solid #2d3548",
								borderRadius: "4px",
								padding: "6px 8px",
								color: "#e2e8f0",
								fontSize: "12px",
							}}
						/>
						<input
							type="number"
							value={(element as any).rowCount || 3}
							onChange={(e) =>
								onChange({ rowCount: parseInt(e.target.value, 10) || 3 })
							}
							placeholder="Row count"
							min={1}
							max={10}
							style={{
								background: "#1e2433",
								border: "1px solid #2d3548",
								borderRadius: "4px",
								padding: "6px 8px",
								color: "#e2e8f0",
								fontSize: "12px",
								width: "80px",
							}}
						/>
						<input
							type="text"
							value={(element as any).rowNavigateTo || ""}
							onChange={(e) =>
								onChange({ rowNavigateTo: e.target.value || undefined })
							}
							placeholder="Navigate to screen..."
							style={{
								background: "#1e2433",
								border: "1px solid #2d3548",
								borderRadius: "4px",
								padding: "6px 8px",
								color: "#e2e8f0",
								fontSize: "12px",
							}}
						/>
					</>
				)}
			</div>
		</div>
	)
}

// Simple Preview Component (inline version of MockPreview)
function MockPreview({
	sections,
	title,
}: {
	sections: MockSection[]
	title?: string
}) {
	return (
		<div
			style={{
				background: "#1a1f2e",
				border: "2px solid #2d3548",
				borderRadius: "16px",
				overflow: "hidden",
				maxWidth: "400px",
			}}
		>
			{title && (
				<div
					style={{
						background: "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
						padding: "10px 16px",
						color: "white",
						fontSize: "13px",
						fontWeight: 600,
					}}
				>
					{title}
				</div>
			)}
			<div
				style={{
					padding: "16px",
					display: "flex",
					flexDirection: "column",
					gap: "16px",
				}}
			>
				{sections.map((section, i) => (
					<SectionPreview key={i} section={section} depth={0} />
				))}
				{sections.length === 0 && (
					<div
						style={{
							color: "#475569",
							fontSize: "13px",
							textAlign: "center",
							padding: "40px",
						}}
					>
						Add sections to see preview
					</div>
				)}
			</div>
		</div>
	)
}

// Section Preview Component (recursive for child sections)
function SectionPreview({
	section,
	depth,
}: {
	section: MockSection
	depth: number
}) {
	const indentPx = depth * 12

	return (
		<div
			style={{
				marginLeft: `${indentPx}px`,
				borderLeft: depth > 0 ? "2px solid rgba(20, 184, 166, 0.3)" : undefined,
				paddingLeft: depth > 0 ? "10px" : undefined,
			}}
		>
			<div
				style={{
					background: "#1e2433",
					borderRadius: "10px",
					overflow: "hidden",
				}}
			>
				{section.title && (
					<div
						style={{
							background:
								depth > 0
									? "rgba(20, 184, 166, 0.08)"
									: "rgba(20, 184, 166, 0.15)",
							padding: "8px 14px",
							borderBottom: "1px solid rgba(20, 184, 166, 0.2)",
							fontSize: depth > 0 ? "10px" : "11px",
							fontWeight: 600,
							color: "#14b8a6",
							textTransform: "uppercase",
						}}
					>
						{section.title}
					</div>
				)}
				<div
					style={{
						padding: "14px",
						display: "flex",
						flexDirection: section.layout === "horizontal" ? "row" : "column",
						gap: "10px",
						flexWrap: "wrap",
					}}
				>
					{section.elements.map((el, j) => (
						<PreviewElement
							key={j}
							element={el}
							horizontal={section.layout === "horizontal"}
						/>
					))}
					{section.elements.length === 0 &&
						(!section.children || section.children.length === 0) && (
							<div
								style={{
									color: "#475569",
									fontSize: "12px",
									fontStyle: "italic",
								}}
							>
								No elements
							</div>
						)}
				</div>

				{/* Render Child Sections */}
				{section.children && section.children.length > 0 && (
					<div
						style={{
							padding: "0 14px 14px",
							display: "flex",
							flexDirection: "column",
							gap: "10px",
						}}
					>
						{section.children.map((child, i) => (
							<SectionPreview key={i} section={child} depth={depth + 1} />
						))}
					</div>
				)}
			</div>
		</div>
	)
}

function PreviewElement({
	element,
	horizontal,
}: {
	element: MockElement
	horizontal?: boolean
}) {
	const style: React.CSSProperties = {
		flex: horizontal ? 1 : undefined,
		minWidth: horizontal ? "100px" : undefined,
	}

	if (element.type === "button") {
		const variant = (element as any).variant || "secondary"
		const bgColors = {
			primary: "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
			secondary: "#2d3548",
			danger: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
		}
		return (
			<div
				style={{
					...style,
					background: bgColors[variant as keyof typeof bgColors],
					padding: "10px 14px",
					borderRadius: "8px",
					fontSize: "12px",
					fontWeight: 600,
					color: variant === "secondary" ? "#94a3b8" : "white",
					textAlign: "center",
				}}
			>
				{element.label}
			</div>
		)
	}

	if (element.type === "input") {
		return (
			<div
				style={{
					...style,
					display: "flex",
					flexDirection: "column",
					gap: "6px",
				}}
			>
				<span
					style={{
						fontSize: "11px",
						color: "#64748b",
						textTransform: "uppercase",
					}}
				>
					{element.label}
				</span>
				<div
					style={{
						background: "#0f1219",
						border: "1px solid #2d3548",
						borderRadius: "6px",
						padding: "10px 12px",
						fontSize: "12px",
						color: "#475569",
					}}
				>
					{(element as any).placeholder || "..."}
				</div>
			</div>
		)
	}

	if (element.type === "text") {
		const variant = (element as any).variant || "body"
		const styles: Record<string, React.CSSProperties> = {
			heading: { fontSize: "16px", fontWeight: 700, color: "#e2e8f0" },
			subheading: { fontSize: "13px", fontWeight: 600, color: "#cbd5e1" },
			body: { fontSize: "12px", color: "#94a3b8" },
			caption: { fontSize: "11px", color: "#64748b" },
		}
		return <div style={{ ...style, ...styles[variant] }}>{element.label}</div>
	}

	if (element.type === "link") {
		return (
			<div
				style={{
					...style,
					fontSize: "12px",
					color: "#14b8a6",
					textDecoration: "underline",
				}}
			>
				{element.label}
			</div>
		)
	}

	if (element.type === "image") {
		const ratio = (element as any).aspectRatio || "16:9"
		const [w, h] = ratio.split(":").map(Number)
		return (
			<div
				style={{
					...style,
					aspectRatio: `${w}/${h}`,
					maxHeight: "120px",
					background: "#252d40",
					border: "2px dashed #3d4660",
					borderRadius: "8px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontSize: "11px",
					color: "#64748b",
				}}
			>
				{element.label}
			</div>
		)
	}

	if (element.type === "list") {
		return (
			<div
				style={{
					...style,
					background: "#0f1219",
					borderRadius: "8px",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						padding: "8px 12px",
						background: "#1a1f2e",
						fontSize: "11px",
						color: "#64748b",
						borderBottom: "1px solid #2d3548",
					}}
				>
					{element.label}
				</div>
				{Array.from({ length: (element as any).itemCount || 3 }).map((_, i) => (
					<div
						key={i}
						style={{
							padding: "8px 12px",
							borderBottom:
								i < ((element as any).itemCount || 3) - 1
									? "1px solid #1e2433"
									: undefined,
						}}
					>
						<div
							style={{
								height: "4px",
								background: "#2d3548",
								borderRadius: "2px",
								width: "70%",
							}}
						/>
					</div>
				))}
			</div>
		)
	}

	if (element.type === "table") {
		const columns = (element as any).columns || ["Col 1", "Col 2", "Col 3"]
		const rowCount = (element as any).rowCount || 3
		return (
			<div
				style={{
					...style,
					background: "#0f1219",
					borderRadius: "8px",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						padding: "8px 12px",
						background: "#1a1f2e",
						fontSize: "11px",
						color: "#64748b",
						borderBottom: "1px solid #2d3548",
					}}
				>
					{element.label}
				</div>
				<table
					style={{
						width: "100%",
						borderCollapse: "collapse",
						fontSize: "11px",
					}}
				>
					<thead>
						<tr>
							{columns.map((col: string, i: number) => (
								<th
									key={i}
									style={{
										padding: "6px 8px",
										textAlign: "left",
										color: "#64748b",
										fontWeight: 600,
										borderBottom: "1px solid #2d3548",
									}}
								>
									{col}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{Array.from({ length: rowCount }).map((_, rowIndex) => (
							<tr key={rowIndex}>
								{columns.map((_: string, colIndex: number) => (
									<td
										key={colIndex}
										style={{
											padding: "6px 8px",
											borderBottom:
												rowIndex < rowCount - 1
													? "1px solid #1e2433"
													: undefined,
										}}
									>
										<div
											style={{
												height: "4px",
												background: "#2d3548",
												borderRadius: "2px",
												width: "60%",
											}}
										/>
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		)
	}

	return (
		<div style={{ color: "#475569", fontSize: "12px" }}>[{element.type}]</div>
	)
}
