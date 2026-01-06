import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "admin.dashboard",
	// Title containing slash to test Mermaid escaping (issue #171)
	title: "Admin / Dashboard",
	route: "/admin/dashboard",

	owner: ["admin"],

	tags: ["admin", "dashboard"],

	// API dependencies to also test the API graph
	dependsOn: ["AdminAPI.getStats", "UserAPI/v2.getUsers"],

	entryPoints: ["home"],

	next: ["settings"],
})
