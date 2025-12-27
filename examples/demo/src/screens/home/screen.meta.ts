import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "home",
	title: "Home",
	route: "/",
	owner: ["platform"],
	tags: ["landing", "public"],
	description: "The main landing page of the application",
	next: ["dashboard", "settings"],
})
