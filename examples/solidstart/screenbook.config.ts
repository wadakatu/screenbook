import { defineConfig } from "@screenbook/core"

export default defineConfig({
	metaPattern: "src/routes/**/screen.meta.ts",
	routesPattern: "src/routes/**/*.tsx",
})
