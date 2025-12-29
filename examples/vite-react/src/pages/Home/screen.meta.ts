import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "home",
	title: "Home",
	route: "/",
	owner: ["platform"],
	tags: ["navigation"],
	description: "Landing page with navigation to main sections",
	next: ["dashboard", "settings"],
	dependsOn: [],
	mock: {
		sections: [
			{
				title: "Header",
				layout: "horizontal",
				elements: [
					{ type: "text", label: "Welcome to Screenbook", variant: "heading" },
				],
			},
			{
				title: "Navigation",
				elements: [
					{
						type: "button",
						label: "Go to Dashboard",
						variant: "primary",
						navigateTo: "dashboard",
					},
					{
						type: "button",
						label: "Settings",
						variant: "secondary",
						navigateTo: "settings",
					},
				],
			},
			{
				title: "Recent Items",
				elements: [
					{
						type: "list",
						label: "Recent Screens",
						itemCount: 3,
						itemNavigateTo: "dashboard",
					},
				],
			},
		],
	},
})
