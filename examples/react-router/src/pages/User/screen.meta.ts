import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "users-id",
	title: "User Detail",
	route: "/users/:id",
	owner: ["frontend"],
	tags: ["users", "detail"],
	dependsOn: ["UserAPI.getUser"],
	entryPoints: ["home"],
	next: ["users-id-profile"],
})
