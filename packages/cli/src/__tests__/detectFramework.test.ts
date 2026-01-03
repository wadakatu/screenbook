import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { detectFramework } from "../utils/detectFramework.js"

describe("detectFramework", () => {
	const testDir = join(process.cwd(), ".test-detect-framework")
	let originalCwd: string

	beforeEach(() => {
		originalCwd = process.cwd()
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true })
		}
		mkdirSync(testDir, { recursive: true })
	})

	afterEach(() => {
		process.chdir(originalCwd)
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true })
		}
	})

	function createPackageJson(
		deps: Record<string, string> = {},
		devDeps: Record<string, string> = {},
	) {
		writeFileSync(
			join(testDir, "package.json"),
			JSON.stringify({
				name: "test-project",
				dependencies: deps,
				devDependencies: devDeps,
			}),
		)
	}

	function createConfigFile(filename: string) {
		writeFileSync(join(testDir, filename), "// config")
	}

	function createDirectory(dirname: string) {
		mkdirSync(join(testDir, dirname), { recursive: true })
	}

	describe("Next.js detection", () => {
		it("should detect Next.js App Router", () => {
			createPackageJson({ next: "^14.0.0", react: "^18.0.0" })
			createConfigFile("next.config.js")
			createDirectory("app")

			const result = detectFramework(testDir)

			expect(result).not.toBeNull()
			expect(result?.name).toBe("Next.js (App Router)")
			expect(result?.routesPattern).toBe("app/**/page.tsx")
		})

		it("should detect Next.js App Router with src directory", () => {
			createPackageJson({ next: "^14.0.0" })
			createConfigFile("next.config.mjs")
			createDirectory("src/app")

			const result = detectFramework(testDir)

			expect(result?.name).toBe("Next.js (App Router)")
		})

		it("should detect Next.js Pages Router", () => {
			createPackageJson({ next: "^14.0.0" })
			createConfigFile("next.config.ts")
			createDirectory("pages")

			const result = detectFramework(testDir)

			expect(result?.name).toBe("Next.js (Pages Router)")
			expect(result?.routesPattern).toBe("pages/**/*.tsx")
		})

		it("should prioritize App Router over Pages Router when both exist", () => {
			createPackageJson({ next: "^14.0.0" })
			createConfigFile("next.config.js")
			createDirectory("app")
			createDirectory("pages")

			const result = detectFramework(testDir)

			expect(result?.name).toBe("Next.js (App Router)")
		})
	})

	describe("Remix detection", () => {
		it("should detect Remix with @remix-run/react", () => {
			createPackageJson({ "@remix-run/react": "^2.0.0" })
			createConfigFile("vite.config.ts")

			const result = detectFramework(testDir)

			expect(result?.name).toBe("Remix")
			expect(result?.routesPattern).toBe("app/routes/**/*.tsx")
		})

		it("should detect Remix with legacy config", () => {
			createPackageJson({}, { remix: "^1.0.0" })
			createConfigFile("remix.config.js")

			const result = detectFramework(testDir)

			expect(result?.name).toBe("Remix")
		})
	})

	describe("Nuxt detection", () => {
		it("should detect Nuxt 3 with pages directory", () => {
			createPackageJson({ nuxt: "^3.0.0", vue: "^3.0.0" })
			createConfigFile("nuxt.config.ts")
			createDirectory("pages")

			const result = detectFramework(testDir)

			expect(result?.name).toBe("Nuxt")
			expect(result?.routesPattern).toBe("pages/**/*.vue")
		})

		it("should detect Nuxt 4 with app/pages directory", () => {
			createPackageJson({ nuxt: "^4.0.0" })
			createConfigFile("nuxt.config.ts")
			createDirectory("app/pages")

			const result = detectFramework(testDir)

			expect(result?.name).toBe("Nuxt 4")
			expect(result?.routesPattern).toBe("app/pages/**/*.vue")
		})
	})

	describe("Astro detection", () => {
		it("should detect Astro", () => {
			createPackageJson({ astro: "^4.0.0" })
			createConfigFile("astro.config.mjs")

			const result = detectFramework(testDir)

			expect(result?.name).toBe("Astro")
			expect(result?.routesPattern).toBe("src/pages/**/*.astro")
		})
	})

	describe("SolidStart detection", () => {
		it("should detect SolidStart with @solidjs/start package and app.config.ts", () => {
			createPackageJson({ "@solidjs/start": "^1.0.0", "solid-js": "^1.8.0" })
			createConfigFile("app.config.ts")
			createDirectory("src/routes")

			const result = detectFramework(testDir)

			expect(result).not.toBeNull()
			expect(result?.name).toBe("SolidStart")
			expect(result?.routesPattern).toBe("src/routes/**/*.tsx")
			expect(result?.metaPattern).toBe("src/routes/**/screen.meta.ts")
		})

		it("should detect SolidStart with app.config.js", () => {
			createPackageJson({ "@solidjs/start": "^1.0.0" })
			createConfigFile("app.config.js")
			createDirectory("src/routes")

			const result = detectFramework(testDir)

			expect(result?.name).toBe("SolidStart")
		})

		it("should not detect SolidStart without src/routes directory", () => {
			createPackageJson({ "@solidjs/start": "^1.0.0" })
			createConfigFile("app.config.ts")
			// No src/routes directory

			const result = detectFramework(testDir)

			expect(result).toBeNull()
		})

		it("should not detect SolidStart without @solidjs/start package", () => {
			createPackageJson({ "solid-js": "^1.8.0" })
			createConfigFile("app.config.ts")
			createDirectory("src/routes")

			const result = detectFramework(testDir)

			expect(result).toBeNull()
		})
	})

	describe("QwikCity detection", () => {
		it("should detect QwikCity with @builder.io/qwik-city package and vite.config.ts", () => {
			createPackageJson({
				"@builder.io/qwik": "^1.5.0",
				"@builder.io/qwik-city": "^1.5.0",
			})
			createConfigFile("vite.config.ts")
			createDirectory("src/routes")

			const result = detectFramework(testDir)

			expect(result).not.toBeNull()
			expect(result?.name).toBe("QwikCity")
			expect(result?.routesPattern).toBe("src/routes/**/index.tsx")
			expect(result?.metaPattern).toBe("src/routes/**/screen.meta.ts")
		})

		it("should detect QwikCity with vite.config.js", () => {
			createPackageJson({ "@builder.io/qwik-city": "^1.5.0" })
			createConfigFile("vite.config.js")
			createDirectory("src/routes")

			const result = detectFramework(testDir)

			expect(result?.name).toBe("QwikCity")
		})

		it("should not detect QwikCity without src/routes directory", () => {
			createPackageJson({ "@builder.io/qwik-city": "^1.5.0" })
			createConfigFile("vite.config.ts")
			// No src/routes directory

			const result = detectFramework(testDir)

			expect(result).toBeNull()
		})

		it("should not detect QwikCity without @builder.io/qwik-city package", () => {
			createPackageJson({ "@builder.io/qwik": "^1.5.0" })
			createConfigFile("vite.config.ts")
			createDirectory("src/routes")

			const result = detectFramework(testDir)

			expect(result).toBeNull()
		})

		it("should detect QwikCity with vite.config.mjs", () => {
			createPackageJson({ "@builder.io/qwik-city": "^1.5.0" })
			createConfigFile("vite.config.mjs")
			createDirectory("src/routes")

			const result = detectFramework(testDir)

			expect(result?.name).toBe("QwikCity")
		})

		it("should detect QwikCity with package in devDependencies", () => {
			createPackageJson({}, { "@builder.io/qwik-city": "^1.5.0" })
			createConfigFile("vite.config.ts")
			createDirectory("src/routes")

			const result = detectFramework(testDir)

			expect(result?.name).toBe("QwikCity")
		})
	})

	describe("TanStack Start detection", () => {
		it("should detect TanStack Start with @tanstack/react-start and __root.tsx", () => {
			createPackageJson({ "@tanstack/react-start": "^1.0.0", react: "^19.0.0" })
			createConfigFile("app.config.ts")
			createDirectory("src/routes")
			writeFileSync(join(testDir, "src/routes/__root.tsx"), "// root")

			const result = detectFramework(testDir)

			expect(result).not.toBeNull()
			expect(result?.name).toBe("TanStack Start")
			expect(result?.routesPattern).toBe("src/routes/**/*.tsx")
			expect(result?.metaPattern).toBe("src/routes/**/screen.meta.ts")
		})

		it("should detect TanStack Start with @tanstack/start (legacy package)", () => {
			createPackageJson({ "@tanstack/start": "^1.0.0" })
			createConfigFile("app.config.ts")
			createDirectory("src/routes")
			writeFileSync(join(testDir, "src/routes/__root.tsx"), "// root")

			const result = detectFramework(testDir)

			expect(result?.name).toBe("TanStack Start")
		})

		it("should detect TanStack Start with app.config.js", () => {
			createPackageJson({ "@tanstack/react-start": "^1.0.0" })
			createConfigFile("app.config.js")
			createDirectory("src/routes")
			writeFileSync(join(testDir, "src/routes/__root.tsx"), "// root")

			const result = detectFramework(testDir)

			expect(result?.name).toBe("TanStack Start")
		})

		it("should not detect TanStack Start without __root.tsx", () => {
			createPackageJson({ "@tanstack/react-start": "^1.0.0" })
			createConfigFile("app.config.ts")
			createDirectory("src/routes")
			// No __root.tsx file

			const result = detectFramework(testDir)

			expect(result).toBeNull()
		})

		it("should not detect TanStack Start without @tanstack/react-start package", () => {
			createPackageJson({ "@tanstack/router": "^1.0.0" })
			createConfigFile("app.config.ts")
			createDirectory("src/routes")
			writeFileSync(join(testDir, "src/routes/__root.tsx"), "// root")

			const result = detectFramework(testDir)

			expect(result).toBeNull()
		})

		it("should detect TanStack Start with package in devDependencies", () => {
			createPackageJson({}, { "@tanstack/react-start": "^1.0.0" })
			createConfigFile("app.config.ts")
			createDirectory("src/routes")
			writeFileSync(join(testDir, "src/routes/__root.tsx"), "// root")

			const result = detectFramework(testDir)

			expect(result?.name).toBe("TanStack Start")
		})
	})

	describe("Vite detection", () => {
		it("should detect Vite + React", () => {
			createPackageJson({ vite: "^5.0.0", react: "^18.0.0" })
			createConfigFile("vite.config.ts")

			const result = detectFramework(testDir)

			expect(result?.name).toBe("Vite + React")
			expect(result?.routesPattern).toBe("src/pages/**/*.tsx")
		})

		it("should detect Vite + Vue", () => {
			createPackageJson({ vite: "^5.0.0", vue: "^3.0.0" })
			createConfigFile("vite.config.ts")

			const result = detectFramework(testDir)

			expect(result?.name).toBe("Vite + Vue")
			expect(result?.routesPattern).toBe("src/pages/**/*.vue")
		})
	})

	describe("No detection", () => {
		it("should return null when no package.json exists", () => {
			const result = detectFramework(testDir)

			expect(result).toBeNull()
		})

		it("should return null when no framework packages found", () => {
			createPackageJson({ express: "^4.0.0" })

			const result = detectFramework(testDir)

			expect(result).toBeNull()
		})

		it("should return null when no config file exists", () => {
			createPackageJson({ next: "^14.0.0" })
			// No next.config.js created

			const result = detectFramework(testDir)

			expect(result).toBeNull()
		})
	})
})
