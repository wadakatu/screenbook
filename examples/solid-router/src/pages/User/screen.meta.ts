import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "user.userId",
	title: "User Profile",
	route: "/user/:userId",
	owner: ["frontend"],
	tags: ["user", "profile"],
	entryPoints: ["dashboard"],
	next: [],
})
