import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "users.detail",
	title: "User Detail",
	route: "/users/:id",
	owner: ["platform"],
	tags: ["users", "detail"],
	description: "User detail page showing individual user information",
	entryPoints: ["users"],
	next: [],
	dependsOn: [],
})
