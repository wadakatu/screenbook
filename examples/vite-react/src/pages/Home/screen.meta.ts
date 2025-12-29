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
				elements: [{ type: "button", label: "Button", variant: "primary" }],
			},
		],
	},
})
