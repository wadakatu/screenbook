import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "billing.invoices",
	title: "Invoices",
	route: "/billing/invoices",
	owner: ["billing"],
	tags: ["billing", "invoices"],
	description: "List of all invoices",
	entryPoints: ["dashboard"],
	next: ["billing.payments"],
	dependsOn: ["InvoiceAPI.list"],
	links: [
		{ label: "API Docs", url: "https://docs.example.com/api/invoices" },
	],
})
