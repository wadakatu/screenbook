import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "dashboard",
	title: "Dashboard",
	route: "/dashboard",
	owner: ["platform"],
	tags: ["analytics", "dashboard"],
	description: "Main dashboard showing analytics and metrics",
	entryPoints: ["home"],
	dependsOn: ["AnalyticsAPI.getStats", "AnalyticsAPI.getRevenue"],

	mock: {
		sections: [
			{
				title: "Header",
				layout: "horizontal",
				elements: [
					{ type: "text", label: "Dashboard", variant: "heading" },
					{ type: "button", label: "Settings", navigateTo: "settings" },
				],
			},
			{
				title: "Stats",
				layout: "horizontal",
				elements: [
					{ type: "text", label: "Total Users: 1,234" },
					{ type: "text", label: "Revenue: $56,789" },
					{ type: "text", label: "Active Sessions: 89" },
				],
			},
			{
				title: "Analytics",
				elements: [
					{ type: "image", label: "Chart", aspectRatio: "16:9" },
					{
						type: "table",
						label: "Recent Activity",
						columns: ["User", "Action", "Time"],
						rowCount: 5,
					},
				],
			},
		],
	},
})
