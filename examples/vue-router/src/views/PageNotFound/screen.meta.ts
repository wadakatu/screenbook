import { defineScreen } from "screenbook"

export const screen = defineScreen({
	id: "not-found",
	title: "Not Found",
	route: "/:pathMatch(.*)*",

	// Team or individual responsible for this screen
	owner: [],

	// Tags for filtering in the catalog
	tags: ["not-found"],

	// APIs/services this screen depends on (for impact analysis)
	// Example: ["UserAPI.getProfile", "PaymentService.checkout"]
	dependsOn: [],

	// Screen IDs that can navigate to this screen
	entryPoints: [],

	// Screen IDs this screen can navigate to
	next: [],
})
