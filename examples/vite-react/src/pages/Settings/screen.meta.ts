import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "settings",
	title: "Settings",
	route: "/settings",
	owner: ["platform"],
	tags: ["settings", "account"],
	description: "User account settings and preferences",
	entryPoints: ["home", "dashboard"],
	dependsOn: ["UserAPI.getProfile", "UserAPI.updateProfile"],

	mock: {
		sections: [
			{
				title: "Header",
				elements: [
					{ type: "text", label: "Settings", variant: "heading" },
				],
			},
			{
				title: "Profile",
				elements: [
					{ type: "input", label: "Name", placeholder: "Enter your name" },
					{ type: "input", label: "Email", inputType: "email", placeholder: "your@email.com" },
					{ type: "image", label: "Avatar", aspectRatio: "1:1" },
				],
			},
			{
				title: "Preferences",
				elements: [
					{
						type: "list",
						label: "Notification Settings",
						itemCount: 3,
					},
				],
			},
			{
				title: "Actions",
				layout: "horizontal",
				elements: [
					{ type: "button", label: "Save Changes", variant: "primary" },
					{ type: "button", label: "Cancel" },
					{ type: "button", label: "Delete Account", variant: "danger" },
				],
			},
		],
	},
})
