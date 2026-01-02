import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "dashboard",
	title: "Dashboard",
	route: "/dashboard",
	owner: ["frontend"],
	tags: ["dashboard"],
	entryPoints: ["home"],
	next: ["user.userId"],
})
