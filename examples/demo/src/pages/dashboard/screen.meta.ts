import { defineScreen } from "screenbook"

export const screen = defineScreen({
	id: "dashboard",
	title: "Dashboard",
	route: "/dashboard",
	owner: ["platform"],
	tags: ["dashboard", "analytics"],
	description: "Main dashboard with key metrics and quick actions",
	entryPoints: ["home"],
	next: ["billing.invoices", "billing.payments", "settings"],
	dependsOn: ["MetricsAPI.getSummary", "UserAPI.getProfile"],
})
