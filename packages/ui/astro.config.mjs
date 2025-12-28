import node from "@astrojs/node"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"

export default defineConfig({
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
