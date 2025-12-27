import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "settings",
	title: "Settings",
	route: "/settings",
	owner: ["platform"],
	tags: ["settings", "user"],
	description: "User settings and preferences",
	entryPoints: ["home", "dashboard"],
	dependsOn: ["UserAPI.getSettings", "UserAPI.updateSettings"],
})
