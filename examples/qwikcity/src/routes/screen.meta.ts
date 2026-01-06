import { defineScreen } from "screenbook"

export const screen = defineScreen({
	id: "home",
	title: "Home",
	route: "/",
	owner: ["platform"],
	tags: ["navigation"],
	description: "Landing page with navigation to main sections",
	next: ["about", "users"],
	dependsOn: [],
})
