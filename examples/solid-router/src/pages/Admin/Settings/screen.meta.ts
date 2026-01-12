import { defineScreen } from "screenbook"

export const screen = defineScreen({
	id: "admin.settings",
	title: "Admin Settings",
	route: "/admin/settings",
	owner: ["admin"],
	tags: ["admin", "settings"],
	entryPoints: ["admin"],
	next: [],
})
