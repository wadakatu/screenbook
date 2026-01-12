import { defineScreen } from "screenbook"

export const screen = defineScreen({
	id: "admin",
	title: "Admin",
	route: "/admin",
	owner: ["admin"],
	tags: ["admin", "dashboard"],
	entryPoints: ["dashboard"],
	next: ["admin.settings"],
})
