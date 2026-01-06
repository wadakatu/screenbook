import { defineScreen } from "screenbook"

export const screen = defineScreen({
	id: "users-id-profile",
	title: "User Profile",
	route: "/users/:id/profile",
	owner: ["frontend"],
	tags: ["users", "profile"],
	dependsOn: ["UserAPI.getUser", "ProfileAPI.getProfile"],
	entryPoints: ["users-id"],
	next: [],
})
