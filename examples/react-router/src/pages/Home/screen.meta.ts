import { defineScreen } from "screenbook"

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
