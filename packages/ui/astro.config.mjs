import node from "@astrojs/node"
import react from "@astrojs/react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"

export default defineConfig({
	integrations: [react()],
	srcDir: "./src",
	outDir: "./dist",
	output: "server",
	adapter: node({
		mode: "standalone",
	}),
	devToolbar: {
		enabled: false,
	},
	vite: {
		plugins: [tailwindcss()],
	},
})
