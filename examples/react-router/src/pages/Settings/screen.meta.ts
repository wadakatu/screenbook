import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "settings",
	title: "Settings",
	route: "/settings",
	owner: ["frontend"],
	tags: ["settings", "configuration"],
	dependsOn: ["SettingsAPI.getSettings"],
	entryPoints: ["home", "dashboard"],
	next: [],
})
