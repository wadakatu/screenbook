import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "invoices.list",
	title: "Invoices List",
	description: "Display all invoices",
	route: "/invoices",
	owner: ["billing"],
	tags: ["invoices", "billing"],
	// Using operationId format
	dependsOn: ["getInvoices"],
	next: ["invoices.detail"],
})
