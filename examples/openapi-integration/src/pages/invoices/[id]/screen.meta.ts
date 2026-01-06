import { defineScreen } from "screenbook"

export const screen = defineScreen({
	id: "invoices.detail",
	title: "Invoice Detail",
	description:
		"Display detailed information about an invoice including payments",
	route: "/invoices/:id",
	owner: ["billing"],
	tags: ["invoices", "billing", "payments"],
	// Using both operationId and HTTP format
	dependsOn: [
		"getInvoiceById",
		"getInvoicePayments",
		// HTTP format example
		"GET /api/users/{id}",
	],
	entryPoints: ["invoices.list"],
})
