import { defineScreen } from "screenbook"

export const screen = defineScreen({
	id: "dashboard",
	title: "Dashboard",
	route: "/dashboard",
	owner: ["frontend"],
	tags: ["dashboard", "analytics"],
	dependsOn: ["AnalyticsAPI.getMetrics"],
	entryPoints: ["home"],
	next: ["settings"],
})
