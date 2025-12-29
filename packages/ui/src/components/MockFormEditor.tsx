import type {
	MockElement,
	MockLayout,
	MockSection,
	ScreenMock,
} from "@screenbook/core"
import { useCallback, useId, useRef, useState } from "react"
import "../styles/mock-editor.css"

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
	const [activeSection, setActiveSection] = useState(0)
	const [saveStatus, setSaveStatus] = useState<
		"idle" | "saving" | "saved" | "error"
	>("idle")
	const [saveError, setSaveError] = useState<string | null>(null)
	const tabListRef = useRef<HTMLDivElement>(null)
	const uniqueId = useId()

	const addSection = useCallback(() => {
		setSections((prev) => {
			const newSections = [...prev, { title: "New Section", elements: [] }]
			// Set active section to the newly added one
			setActiveSection(newSections.length - 1)
			return newSections
		})
	}, [])

	// Handle keyboard navigation for tab list (Arrow keys)
	const handleTabKeyDown = useCallback(
		(e: React.KeyboardEvent, index: number) => {
			const lastIndex = sections.length - 1
			let newIndex = index

			switch (e.key) {
				case "ArrowDown":
				case "ArrowRight":
					e.preventDefault()
					newIndex = index >= lastIndex ? 0 : index + 1
					break
				case "ArrowUp":
				case "ArrowLeft":
					e.preventDefault()
					newIndex = index <= 0 ? lastIndex : index - 1
					break
				case "Home":
					e.preventDefault()
					newIndex = 0
					break
				case "End":
					e.preventDefault()
					newIndex = lastIndex
					break
				default:
					return
			}

			setActiveSection(newIndex)
			// Focus the new tab
			const tabList = tabListRef.current
			if (tabList) {
				const tabs = tabList.querySelectorAll<HTMLButtonElement>('[role="tab"]')
				tabs[newIndex]?.focus()
			}
		},
		[sections.length],
	)

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

	const removeSectionByPath = useCallback(
		(path: number[]) => {
			setSections((prev) => {
				const newSections = removeSectionAtPath(prev, path)
				// Adjust active section if needed
				if (path.length === 1) {
					const removedIndex = path[0]
					if (activeSection >= newSections.length) {
						setActiveSection(Math.max(0, newSections.length - 1))
					} else if (activeSection > removedIndex) {
						setActiveSection(activeSection - 1)
					}
				}
				return newSections
			})
		},
		[activeSection],
	)

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

	const currentSection = sections[activeSection]

	return (
		<div className="mock-editor">
			{/* Skip Link for Accessibility */}
			<a href="#main-editor" className="mock-editor__skip-link">
				Skip to editor
			</a>

			{/* Left Sidebar - Section Navigation */}
			<nav
				className="mock-editor__sidebar"
				aria-label="Section navigation"
			>
				<div className="mock-editor__sidebar-header">
					<span className="mock-editor__title">Mock Editor</span>
					{screenId && (
						<div className="mock-editor__screen-info">
							<span className="mock-editor__screen-label">SCREEN</span>
							<span className="mock-editor__screen-badge">{screenId}</span>
						</div>
					)}
				</div>

				<div className="mock-editor__sidebar-content">
					<h2 id={`${uniqueId}-sections-label`} className="mock-editor__sections-label">
						SECTIONS
					</h2>
					<div
						ref={tabListRef}
						role="tablist"
						aria-labelledby={`${uniqueId}-sections-label`}
						aria-orientation="vertical"
						className="mock-editor__tab-list"
					>
						{sections.map((section, index) => (
							<button
								key={index}
								type="button"
								role="tab"
								id={`${uniqueId}-tab-${index}`}
								aria-selected={activeSection === index}
								aria-controls={`${uniqueId}-panel-${index}`}
								tabIndex={activeSection === index ? 0 : -1}
								className={`mock-editor__section-tab ${activeSection === index ? "mock-editor__section-tab--active" : ""}`}
								onClick={() => setActiveSection(index)}
								onKeyDown={(e) => handleTabKeyDown(e, index)}
							>
								<span className="mock-editor__tab-icon">
									{(section.title || "Section")[0].toUpperCase()}
								</span>
								<span className="mock-editor__tab-content">
									<span className="mock-editor__tab-title">
										{section.title || "Untitled"}
									</span>
									<span className="mock-editor__tab-count">
										{section.elements.length} element{section.elements.length !== 1 ? "s" : ""}
									</span>
								</span>
								{activeSection === index && (
									<span className="mock-editor__tab-indicator" aria-hidden="true" />
								)}
							</button>
						))}
					</div>

					<button
						type="button"
						onClick={addSection}
						className="mock-editor__add-section-btn"
					>
						+ Add Section
					</button>
				</div>
			</nav>

			{/* Center Panel - Editor */}
			<section id="main-editor" className="mock-editor__main" aria-label="Section editor">
				{/* Editor Header */}
				<header className="mock-editor__header">
					<div className="mock-editor__header-left">
						<label className="mock-editor__field-label">
							<span className="mock-editor__field-label-text">Section title</span>
							<input
								type="text"
								value={currentSection?.title || ""}
								onChange={(e) =>
									updateSectionByPath([activeSection], { title: e.target.value })
								}
								placeholder="Section title"
								className="mock-editor__section-input"
								aria-describedby={`${uniqueId}-title-hint`}
							/>
							<span id={`${uniqueId}-title-hint`} className="mock-editor__sr-only">
								Edit the section title
							</span>
						</label>

						<fieldset className="mock-editor__layout-group">
							<legend className="mock-editor__sr-only">Section layout</legend>
							{(["horizontal", "vertical", "grid"] as const).map((layout) => (
								<label
									key={layout}
									className={`mock-editor__layout-option ${currentSection?.layout === layout || (!currentSection?.layout && layout === "vertical") ? "mock-editor__layout-option--active" : ""}`}
								>
									<input
										type="radio"
										name={`${uniqueId}-layout`}
										value={layout}
										checked={
											currentSection?.layout === layout ||
											(!currentSection?.layout && layout === "vertical")
										}
										onChange={() =>
											updateSectionByPath([activeSection], { layout })
										}
										className="mock-editor__sr-only"
									/>
									<span className="mock-editor__layout-label">
										{layout.charAt(0).toUpperCase() + layout.slice(1)}
									</span>
								</label>
							))}
						</fieldset>
					</div>

					<div className="mock-editor__header-right">
						<label className="mock-editor__sr-only" htmlFor={`${uniqueId}-template`}>
							Select template
						</label>
						<select
							id={`${uniqueId}-template`}
							className="mock-editor__template-select"
							onChange={(e) => {
								if (e.target.value) {
									applyTemplate(e.target.value)
									e.target.value = ""
								}
							}}
							defaultValue=""
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
							<span className="mock-editor__status mock-editor__status--error" role="alert">
								{saveError}
							</span>
						)}
						{saveStatus === "saved" && (
							<span className="mock-editor__status mock-editor__status--success" role="status">
								Saved!
							</span>
						)}

						<button
							type="button"
							onClick={exportMock}
							className="mock-editor__btn mock-editor__btn--secondary"
						>
							Copy Code
						</button>
						<button
							type="button"
							onClick={saveMock}
							disabled={saveStatus === "saving" || !screenId}
							className="mock-editor__btn mock-editor__btn--primary"
							title={!screenId ? "Save requires a screen ID" : undefined}
						>
							{saveStatus === "saving" ? "Saving..." : "Save"}
						</button>
					</div>
				</header>

				{/* Editor Content - Active Section */}
				<div
					id={`${uniqueId}-panel-${activeSection}`}
					role="tabpanel"
					aria-labelledby={`${uniqueId}-tab-${activeSection}`}
					tabIndex={0}
					className="mock-editor__editor-content"
				>
					{currentSection && (
						<>
							<h2 className="mock-editor__sr-only">
								{currentSection.title || "Untitled"} section editor
							</h2>

							{/* Elements */}
							<div className="mock-editor__elements">
								{currentSection.elements.map((element, elementIndex) => (
									<ElementEditor
										key={elementIndex}
										element={element}
										onChange={(updates) =>
											updateElementByPath([activeSection], elementIndex, updates)
										}
										onRemove={() =>
											removeElementByPath([activeSection], elementIndex)
										}
									/>
								))}

								{currentSection.elements.length === 0 && (
									<div className="mock-editor__empty-elements">
										No elements yet. Add elements using the buttons below.
									</div>
								)}
							</div>

							{/* Add Element Buttons */}
							<div className="mock-editor__element-buttons" role="group" aria-label="Add element">
								{ELEMENT_TYPES.map((type) => (
									<button
										key={type.value}
										type="button"
										onClick={() => addElementByPath([activeSection], type.value)}
										className={`mock-editor__add-element-btn mock-editor__add-element-btn--${type.value}`}
										aria-label={`Add ${type.label} element`}
									>
										+ {type.label}
									</button>
								))}
							</div>

							{/* Child Sections */}
							{currentSection.children && currentSection.children.length > 0 && (
								<div className="mock-editor__children">
									<h3 className="mock-editor__children-title">Child Sections</h3>
									{currentSection.children.map((childSection, childIndex) => (
										<SectionEditor
											key={childIndex}
											section={childSection}
											path={[activeSection, childIndex]}
											depth={1}
											onUpdate={updateSectionByPath}
											onRemove={removeSectionByPath}
											onAddChild={addChildSection}
											onAddElement={addElementByPath}
											onRemoveElement={removeElementByPath}
											onUpdateElement={updateElementByPath}
										/>
									))}
								</div>
							)}

							<button
								type="button"
								onClick={() => addChildSection([activeSection])}
								className="mock-editor__add-child-btn"
								aria-label="Add child section to current section"
							>
								+ Add Child Section
							</button>
						</>
					)}
				</div>
			</section>

			{/* Right Panel - Preview */}
			<aside className="mock-editor__preview-panel" aria-label="Live preview">
				<div className="mock-editor__preview-header">
					<span className="mock-editor__preview-label">LIVE PREVIEW</span>
					<span className="mock-editor__preview-scale">100%</span>
				</div>
				<div className="mock-editor__preview-wrapper">
					<MockPreview sections={sections} title={screenTitle} />
				</div>
			</aside>
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
	const sectionClass = `mock-editor__section${depth > 0 ? " mock-editor__section--child" : ""}`

	return (
		<div className={sectionClass}>
			{/* Section Header */}
			<div className="mock-editor__section-header">
				<input
					type="text"
					value={section.title || ""}
					onChange={(e) => onUpdate(path, { title: e.target.value })}
					placeholder="Section title"
					className="mock-editor__section-input"
				/>
				<select
					value={section.layout || "vertical"}
					onChange={(e) =>
						onUpdate(path, { layout: e.target.value as MockLayout })
					}
					className="mock-editor__layout-select"
				>
					<option value="vertical">Vertical</option>
					<option value="horizontal">Horizontal</option>
					<option value="grid">Grid</option>
				</select>
				{depth > 0 && (
					<span className="mock-editor__depth-badge">L{depth}</span>
				)}
				<button
					type="button"
					onClick={() => onRemove(path)}
					className="mock-editor__remove-btn"
				>
					×
				</button>
			</div>

			{/* Elements */}
			<div className="mock-editor__section-body">
				{section.elements.map((element, elementIndex) => (
					<ElementEditor
						key={elementIndex}
						element={element}
						onChange={(updates) => onUpdateElement(path, elementIndex, updates)}
						onRemove={() => onRemoveElement(path, elementIndex)}
					/>
				))}

				{section.elements.length === 0 && (
					<div className="mock-editor__empty-elements">No elements yet</div>
				)}

				{/* Add Element Buttons */}
				<div className="mock-editor__element-buttons">
					{ELEMENT_TYPES.map((type) => (
						<button
							key={type.value}
							type="button"
							onClick={() => onAddElement(path, type.value)}
							className={`mock-editor__add-element-btn mock-editor__add-element-btn--${type.value}`}
						>
							+ {type.label}
						</button>
					))}
				</div>
			</div>

			{/* Add Child Section Button */}
			<div className="mock-editor__section-footer">
				<button
					type="button"
					onClick={() => onAddChild(path)}
					className="mock-editor__add-child-btn"
				>
					+ Add Child Section
				</button>
			</div>

			{/* Render Child Sections Recursively */}
			{section.children && section.children.length > 0 && (
				<div className="mock-editor__children">
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
	const elementClass = `mock-editor__element mock-editor__element--${element.type}`
	const typeClass = `mock-editor__element-type mock-editor__element-type--${element.type}`

	return (
		<div className={elementClass}>
			<div className="mock-editor__element-header">
				<span className={typeClass}>{element.type}</span>
				<button
					type="button"
					onClick={onRemove}
					className="mock-editor__remove-btn"
				>
					×
				</button>
			</div>

			<div className="mock-editor__element-fields">
				<input
					type="text"
					value={element.label}
					onChange={(e) => onChange({ label: e.target.value })}
					placeholder="Label"
					className="mock-editor__field-input"
				/>

				{element.type === "button" && (
					<>
						<select
							value={(element as any).variant || "secondary"}
							onChange={(e) => onChange({ variant: e.target.value as any })}
							className="mock-editor__field-select"
						>
							<option value="primary">Primary</option>
							<option value="secondary">Secondary</option>
							<option value="danger">Danger</option>
						</select>
						<input
							type="text"
							value={(element as any).navigateTo || ""}
							onChange={(e) =>
								onChange({ navigateTo: e.target.value || undefined })
							}
							placeholder="Navigate to (screen id)"
							className="mock-editor__field-input"
						/>
					</>
				)}

				{element.type === "input" && (
					<>
						<select
							value={(element as any).inputType || "text"}
							onChange={(e) => onChange({ inputType: e.target.value as any })}
							className="mock-editor__field-select"
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
							className="mock-editor__field-input"
						/>
					</>
				)}

				{element.type === "text" && (
					<select
						value={(element as any).variant || "body"}
						onChange={(e) => onChange({ variant: e.target.value as any })}
						className="mock-editor__field-select"
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
						className="mock-editor__field-input"
					/>
				)}

				{element.type === "image" && (
					<select
						value={(element as any).aspectRatio || "16:9"}
						onChange={(e) => onChange({ aspectRatio: e.target.value })}
						className="mock-editor__field-select"
					>
						<option value="16:9">16:9</option>
						<option value="4:3">4:3</option>
						<option value="1:1">1:1</option>
						<option value="3:4">3:4</option>
					</select>
				)}

				{element.type === "list" && (
					<div className="mock-editor__field-row">
						<input
							type="number"
							value={(element as any).itemCount || 3}
							onChange={(e) =>
								onChange({ itemCount: parseInt(e.target.value, 10) || 3 })
							}
							placeholder="Items"
							min={1}
							max={10}
							className="mock-editor__field-input mock-editor__field-input--small"
						/>
						<input
							type="text"
							value={(element as any).itemNavigateTo || ""}
							onChange={(e) =>
								onChange({ itemNavigateTo: e.target.value || undefined })
							}
							placeholder="Navigate to screen..."
							className="mock-editor__field-input"
						/>
					</div>
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
							className="mock-editor__field-input"
						/>
						<div className="mock-editor__field-row">
							<input
								type="number"
								value={(element as any).rowCount || 3}
								onChange={(e) =>
									onChange({ rowCount: parseInt(e.target.value, 10) || 3 })
								}
								placeholder="Rows"
								min={1}
								max={10}
								className="mock-editor__field-input mock-editor__field-input--small"
							/>
							<input
								type="text"
								value={(element as any).rowNavigateTo || ""}
								onChange={(e) =>
									onChange({ rowNavigateTo: e.target.value || undefined })
								}
								placeholder="Navigate to screen..."
								className="mock-editor__field-input"
							/>
						</div>
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
		<div className="mock-editor__preview">
			{title && <div className="mock-editor__preview-header">{title}</div>}
			<div className="mock-editor__preview-body">
				{sections.map((section, i) => (
					<SectionPreview key={i} section={section} depth={0} />
				))}
				{sections.length === 0 && (
					<div className="mock-editor__preview-empty">
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
	const sectionClass = `mock-editor__preview-section${depth > 0 ? " mock-editor__preview-section--child" : ""}`
	const titleClass = `mock-editor__preview-section-title${depth > 0 ? " mock-editor__preview-section-title--child" : ""}`

	const bodyClass = `mock-editor__preview-section-body${
		section.layout === "horizontal"
			? " mock-editor__preview-section-body--horizontal"
			: section.layout === "grid"
				? " mock-editor__preview-section-body--grid"
				: ""
	}`

	return (
		<div className={sectionClass}>
			{section.title && <div className={titleClass}>{section.title}</div>}
			<div className={bodyClass}>
				{section.elements.map((el, j) => (
					<PreviewElement
						key={j}
						element={el}
						horizontal={section.layout === "horizontal"}
					/>
				))}
				{section.elements.length === 0 &&
					(!section.children || section.children.length === 0) && (
						<div className="mock-editor__preview-empty">No elements</div>
					)}
			</div>

			{/* Render Child Sections */}
			{section.children && section.children.length > 0 && (
				<div style={{ padding: "0 14px 14px" }}>
					{section.children.map((child, i) => (
						<SectionPreview key={i} section={child} depth={depth + 1} />
					))}
				</div>
			)}
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
	const wrapperClass = `mock-editor__preview-element${horizontal ? " mock-editor__preview-element--horizontal" : ""}`

	if (element.type === "button") {
		const variant = (element as any).variant || "secondary"
		return (
			<div className={wrapperClass}>
				<div
					className={`mock-editor__preview-button mock-editor__preview-button--${variant}`}
				>
					{element.label}
				</div>
			</div>
		)
	}

	if (element.type === "input") {
		return (
			<div className={`${wrapperClass} mock-editor__preview-input`}>
				<span className="mock-editor__preview-input-label">
					{element.label}
				</span>
				<div className="mock-editor__preview-input-field">
					{(element as any).placeholder || "..."}
				</div>
			</div>
		)
	}

	if (element.type === "text") {
		const variant = (element as any).variant || "body"
		return (
			<div className={`${wrapperClass} mock-editor__preview-text--${variant}`}>
				{element.label}
			</div>
		)
	}

	if (element.type === "link") {
		return (
			<div className={`${wrapperClass} mock-editor__preview-link`}>
				{element.label}
			</div>
		)
	}

	if (element.type === "image") {
		const ratio = (element as any).aspectRatio || "16:9"
		const [w, h] = ratio.split(":").map(Number)
		return (
			<div
				className={`${wrapperClass} mock-editor__preview-image`}
				style={{ aspectRatio: `${w}/${h}` }}
			>
				{element.label}
			</div>
		)
	}

	if (element.type === "list") {
		return (
			<div className={`${wrapperClass} mock-editor__preview-list`}>
				<div className="mock-editor__preview-list-header">{element.label}</div>
				{Array.from({ length: (element as any).itemCount || 3 }).map((_, i) => (
					<div key={i} className="mock-editor__preview-list-item">
						<div className="mock-editor__preview-list-placeholder" />
					</div>
				))}
			</div>
		)
	}

	if (element.type === "table") {
		const columns = (element as any).columns || ["Col 1", "Col 2", "Col 3"]
		const rowCount = (element as any).rowCount || 3
		return (
			<div className={`${wrapperClass} mock-editor__preview-table`}>
				<div className="mock-editor__preview-table-header">{element.label}</div>
				<table>
					<thead>
						<tr>
							{columns.map((col: string, i: number) => (
								<th key={i}>{col}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{Array.from({ length: rowCount }).map((_, rowIndex) => (
							<tr key={rowIndex}>
								{columns.map((_: string, colIndex: number) => (
									<td key={colIndex}>
										<div className="mock-editor__preview-table-placeholder" />
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		)
	}

	return <div className={wrapperClass}>[{element.type}]</div>
}
