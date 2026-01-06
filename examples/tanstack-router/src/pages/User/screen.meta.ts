import { defineScreen } from "screenbook"

export const screen = defineScreen({
	id: "users.userId",
	title: "User Detail",
	route: "/users/:userId",
	owner: ["frontend"],
	tags: ["users"],
	dependsOn: ["UserAPI.getUser"],
	entryPoints: ["home"],
	next: ["users.userId.profile"],
})
