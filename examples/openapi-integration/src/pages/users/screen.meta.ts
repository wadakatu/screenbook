import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "users.list",
	title: "Users List",
	description: "Display all users in the system",
	route: "/users",
	owner: ["platform"],
	tags: ["users", "admin"],
	// Using operationId format
	dependsOn: ["getUsers"],
	next: ["users.detail"],
})
