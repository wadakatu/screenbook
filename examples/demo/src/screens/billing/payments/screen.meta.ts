import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
	id: "billing.payments",
	title: "Payments",
	route: "/billing/payments",
	owner: ["billing"],
	tags: ["billing", "payments"],
	description: "Payment history and management",
	entryPoints: ["dashboard", "billing.invoices"],
	dependsOn: ["PaymentAPI.list", "PaymentAPI.process"],
	links: [
		{ label: "Stripe Dashboard", url: "https://dashboard.stripe.com" },
	],
})
