import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "home",
	title: "Home",
	route: "/",
	owner: ["platform"],
	tags: ["navigation"],
	description: "Landing page with navigation to main sections",
	dependsOn: [],

	mock: {
		sections: [
			{
				title: "Header",
				layout: "horizontal",
				elements: [
					{ type: "text", label: "Screenbook Demo", variant: "heading" },
					{ type: "link", label: "Settings", navigateTo: "settings" },
				],
			},
			{
				title: "Hero",
				elements: [
					{ type: "text", label: "Welcome to Screenbook", variant: "subheading" },
					{ type: "text", label: "A screen catalog and navigation graph generator" },
					{ type: "image", label: "Hero Image", aspectRatio: "16:9" },
				],
			},
			{
				title: "Actions",
				layout: "horizontal",
				elements: [
					{ type: "button", label: "View Dashboard", variant: "primary", navigateTo: "dashboard" },
					{ type: "button", label: "Settings", navigateTo: "settings" },
				],
			},
		],
	},
})
