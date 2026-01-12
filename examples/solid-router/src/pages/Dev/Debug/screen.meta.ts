import { defineScreen } from "screenbook"

export const screen = defineScreen({
	id: "dev.debug",
	title: "Dev Debug",
	route: "/dev/debug",
	owner: ["frontend"],
	tags: ["dev", "debug"],
	entryPoints: ["dashboard"],
	next: [],
})
