import { defineScreen } from "screenbook"

export const screen = defineScreen({
	id: "dashboard",
	title: "Dashboard",
	route: "/dashboard",
	owner: ["platform"],
	tags: ["analytics", "dashboard"],
	description: "Main dashboard showing analytics and metrics",
	entryPoints: ["home"],
	next: ["settings"],
	dependsOn: ["AnalyticsAPI.getStats", "AnalyticsAPI.getRevenue"],
})
