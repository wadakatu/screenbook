import { defineScreen } from "screenbook"

export const screen = defineScreen({
	id: "dashboard",
	title: "Dashboard",
	route: "/dashboard",
	owner: ["platform"],
	tags: ["analytics", "dashboard"],
	description: "Main dashboard showing analytics and metrics",
	entryPoints: ["home"],
	next: ["settings"],
	dependsOn: ["AnalyticsAPI.getStats", "AnalyticsAPI.getRevenue"],
	links: [
		{
			type: "figma",
			url: "https://www.figma.com/file/abc123/Dashboard-Design?node-id=1:2",
			label: "Desktop Design",
		},
		{
			type: "figma",
			url: "https://www.figma.com/file/abc123/Dashboard-Design?node-id=1:3",
			label: "Mobile Design",
		},
		{
			type: "storybook",
			url: "https://storybook.example.com/?path=/story/dashboard",
			label: "Storybook",
		},
		{
			type: "docs",
			url: "https://wiki.example.com/dashboard",
			label: "Documentation",
		},
	],
})
