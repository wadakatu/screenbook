import tailwindcss from "@tailwindcss/vite"
import node from "@astrojs/node"
import { defineConfig } from "astro/config"

export default defineConfig({
	srcDir: "./src",
	outDir: "./dist",
	output: "server",
	adapter: node({
		mode: "standalone",
	}),
	vite: {
		plugins: [tailwindcss()],
	},
})
