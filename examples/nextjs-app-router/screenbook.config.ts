import { defineConfig } from "screenbook"

export default defineConfig({
	metaPattern: "src/app/**/screen.meta.ts",
	routesPattern: "src/app/**/page.tsx",
})
