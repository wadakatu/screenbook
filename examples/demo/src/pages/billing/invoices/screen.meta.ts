import { defineScreen } from "screenbook"

export const screen = defineScreen({
	id: "billing.invoices",
	title: "Invoices",
	route: "/billing/invoices",
	owner: ["billing"],
	tags: ["billing", "invoices"],
	description: "List of all invoices",
	entryPoints: ["dashboard"],
	next: ["billing.payments"],
	dependsOn: ["BillingAPI.listInvoices"],
})
