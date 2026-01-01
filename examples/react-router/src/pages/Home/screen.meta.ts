import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "home",
	title: "Home",
	route: "/",
	owner: ["frontend"],
	tags: ["home"],
	dependsOn: [],
	entryPoints: [],
	next: ["dashboard", "settings"],
})
