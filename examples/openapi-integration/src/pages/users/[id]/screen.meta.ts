import { defineScreen } from "screenbook"

export const screen = defineScreen({
	id: "users.detail",
	title: "User Detail",
	description: "Display detailed information about a user",
	route: "/users/:id",
	owner: ["platform"],
	tags: ["users", "admin"],
	// Using operationId format
	dependsOn: ["getUserById"],
	entryPoints: ["users.list"],
})
