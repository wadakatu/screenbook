import { defineConfig } from "screenbook"

export default defineConfig({
	// File-based routing pattern (similar to Next.js App Router)
	routesPattern: "src/pages/**/page.tsx",

	// Screen metadata file pattern
	metaPattern: "src/pages/**/screen.meta.ts",

	// API integration settings
	apiIntegration: {
		openapi: {
			// OpenAPI specification file
			sources: ["./openapi.yaml"],
		},
	},
})
