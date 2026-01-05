import starlight from "@astrojs/starlight"
import { defineConfig } from "astro/config"
import starlightLlmsTxt from "starlight-llms-txt"
import starlightTypeDoc, { typeDocSidebarGroup } from "starlight-typedoc"

export default defineConfig({
	site: "https://wadakatu.github.io",
	base: "/screenbook",
	// Workaround for Zod 4 compatibility
	// See: https://github.com/withastro/astro/issues/14117
	vite: {
		ssr: {
			noExternal: ["zod"],
		},
	},
	integrations: [
		starlight({
			title: "Screenbook",
			description:
				"Screen catalog and navigation graph generator for frontend applications",
			logo: {
				light: "./src/assets/logo-dark.svg",
				dark: "./src/assets/logo.svg",
				replacesTitle: true,
			},
			customCss: ["./src/styles/custom.css"],
			head: [
				{
					tag: "link",
					attrs: {
						rel: "icon",
						href: "/screenbook/favicon.svg",
						type: "image/svg+xml",
					},
				},
			],
			social: [
				{
					icon: "github",
					label: "GitHub",
					href: "https://github.com/wadakatu/screenbook",
				},
			],
			plugins: [
				starlightLlmsTxt(),
				starlightTypeDoc({
					entryPoints: ["../packages/core/src/index.ts"],
					tsconfig: "../packages/core/tsconfig.json",
					output: "api",
					sidebar: {
						label: "API Reference",
						collapsed: true,
					},
				}),
			],
			sidebar: [
				{
					label: "Getting Started",
					items: [
						{ label: "Installation", slug: "getting-started/installation" },
						{ label: "Quick Start", slug: "getting-started/quick-start" },
						{ label: "Configuration", slug: "getting-started/configuration" },
					],
				},
				{
					label: "Guides",
					items: [
						{ label: "Framework Support", slug: "guides/framework-support" },
						{ label: "Framework Examples", slug: "guides/framework-examples" },
						{ label: "Define Screens", slug: "guides/define-screen" },
						{ label: "Navigation Graph", slug: "guides/navigation-graph" },
						{ label: "Impact Analysis", slug: "guides/impact-analysis" },
						{
							label: "OpenAPI Integration",
							slug: "guides/openapi-integration",
						},
						{
							label: "Progressive Adoption",
							slug: "guides/progressive-adoption",
						},
						{ label: "CI Integration", slug: "guides/ci-integration" },
					],
				},
				{
					label: "CLI Commands",
					items: [
						{ label: "Overview", slug: "cli" },
						{ label: "init", slug: "cli/init" },
						{ label: "generate", slug: "cli/generate" },
						{ label: "build", slug: "cli/build" },
						{ label: "dev", slug: "cli/dev" },
						{ label: "lint", slug: "cli/lint" },
						{ label: "impact", slug: "cli/impact" },
						{ label: "pr-impact", slug: "cli/pr-impact" },
					],
				},
				typeDocSidebarGroup,
			],
			editLink: {
				baseUrl: "https://github.com/wadakatu/screenbook/edit/main/docs/",
			},
			lastUpdated: true,
		}),
	],
})
