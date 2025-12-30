import { defineScreen } from "screenbook"

export const screen = defineScreen({
	id: "billing.payments",
	title: "Payments",
	route: "/billing/payments",
	owner: ["billing"],
	tags: ["billing", "payments"],
	description: "Payment history and methods",
	entryPoints: ["dashboard", "billing.invoices"],
	dependsOn: ["BillingAPI.listPayments", "BillingAPI.getPaymentMethods"],
})
