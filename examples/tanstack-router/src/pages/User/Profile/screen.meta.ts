import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "users.userId.profile",
	title: "User Profile",
	route: "/users/:userId/profile",
	owner: ["frontend"],
	tags: ["users", "profile"],
	dependsOn: ["UserAPI.getProfile"],
	entryPoints: ["users.userId"],
	next: [],
})
