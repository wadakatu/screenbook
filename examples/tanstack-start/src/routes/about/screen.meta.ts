import { defineScreen } from "screenbook"

export const screen = defineScreen({
	id: "about",
	title: "About",
	route: "/about",
	owner: ["platform"],
	tags: ["about", "info"],
	description: "About page with application information",
	entryPoints: ["home"],
	next: [],
	dependsOn: [],
})
