import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "home",
	title: "Home",
	route: "/",
	owner: ["frontend"],
	tags: ["home", "landing"],
	entryPoints: [],
	next: ["about", "dashboard"],
})
