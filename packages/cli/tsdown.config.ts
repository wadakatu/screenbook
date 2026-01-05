import { defineConfig } from "tsdown"

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	dts: true,
	clean: true,
	external: [
		"@vue/compiler-sfc",
		"@vue/compiler-core",
		"@vue/compiler-dom",
		"@vue/compiler-ssr",
		"@vue/shared",
	],
})
