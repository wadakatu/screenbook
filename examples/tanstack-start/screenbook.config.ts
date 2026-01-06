import { defineConfig } from "screenbook"

export default defineConfig({
	metaPattern: "src/routes/**/screen.meta.ts",
	routesPattern: "src/routes/**/*.tsx",
})
