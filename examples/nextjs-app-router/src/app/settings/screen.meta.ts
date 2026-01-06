import { defineScreen } from "screenbook"

export const screen = defineScreen({
	id: "settings",
	title: "Settings",
	route: "/settings",
	owner: ["platform"],
	tags: ["settings", "account"],
	description: "User account settings and preferences",
	entryPoints: ["home", "dashboard"],
	next: [],
	dependsOn: ["UserAPI.getProfile", "UserAPI.updateProfile"],
})
