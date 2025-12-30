import { defineConfig } from "screenbook"

export default defineConfig({
	// Scan for screen.meta.ts files alongside route files
	metaPattern: "src/pages/**/screen.meta.ts",

	// Route file pattern (for generate/lint commands)
	routesPattern: "src/pages/**/page.tsx",
})
