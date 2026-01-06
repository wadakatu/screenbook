import { defineScreen } from "screenbook"

export const screen = defineScreen({
	id: "about",
	title: "About",
	route: "/about",
	owner: ["frontend"],
	tags: ["about", "info"],
	entryPoints: ["home"],
	next: [],
})
