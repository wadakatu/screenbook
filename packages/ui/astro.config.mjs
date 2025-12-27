import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"

export default defineConfig({
	srcDir: "./src",
	outDir: "./dist",
	vite: {
		plugins: [tailwindcss()],
	},
})
