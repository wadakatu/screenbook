import { defineScreen } from "screenbook"

export const screen = defineScreen({
	id: "home",
	title: "Home",
	route: "/",
	owner: ["platform"],
	tags: ["landing"],
	description: "The main landing page",
	next: ["dashboard"],
})
