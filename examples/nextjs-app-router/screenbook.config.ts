import { defineConfig } from "@screenbook/core"

export default defineConfig({
	metaPattern: "src/app/**/screen.meta.ts",
	routesPattern: "src/app/**/page.tsx",
})
