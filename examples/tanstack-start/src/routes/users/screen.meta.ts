import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "users",
	title: "Users",
	route: "/users",
	owner: ["platform"],
	tags: ["users", "list"],
	description: "User list page showing all users",
	entryPoints: ["home"],
	next: ["users.detail"],
	dependsOn: [],
})
