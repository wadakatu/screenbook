import { defineScreen } from "screenbook"

export const screen = defineScreen({
	id: "home",
	title: "Home",
	route: "/",
	owner: ["platform"],
	tags: ["home", "landing"],
	description: "Home page for the TanStack Start application",
	entryPoints: [],
	next: ["about", "users"],
	dependsOn: [],
})
