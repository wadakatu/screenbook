import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "about",
	title: "About",
	route: "/about",
	owner: ["platform"],
	tags: ["info"],
	description: "About page with application information",
	entryPoints: ["home"],
	next: [],
	dependsOn: [],
})
