import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "dashboard",
	title: "Dashboard",
	route: "/dashboard",
	owner: ["frontend"],
	tags: ["dashboard"],
	dependsOn: ["DashboardAPI.getData"],
	entryPoints: ["home"],
	next: ["settings"],
})
