import { defineScreen } from "screenbook"

export const screen = defineScreen({
	id: "projects",
	title: "Projects",
	route: "/projects",

	// Team or individual responsible for this screen
	owner: [],

	// Tags for filtering in the catalog
	tags: ["projects"],

	// APIs/services this screen depends on (for impact analysis)
	// Example: ["UserAPI.getProfile", "PaymentService.checkout"]
	dependsOn: [],

	// Screen IDs that can navigate to this screen
	entryPoints: [],

	// Screen IDs this screen can navigate to
	next: [],
})
