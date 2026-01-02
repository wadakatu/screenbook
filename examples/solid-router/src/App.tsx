import { A } from "@solidjs/router"
import type { ParentProps } from "solid-js"

export default function App(props: ParentProps) {
	return (
		<div>
			<nav style={{ padding: "1rem", "border-bottom": "1px solid #ccc" }}>
				<A href="/" style={{ "margin-right": "1rem" }}>
					Home
				</A>
				<A href="/about" style={{ "margin-right": "1rem" }}>
					About
				</A>
				<A href="/dashboard" style={{ "margin-right": "1rem" }}>
					Dashboard
				</A>
				<A href="/user/123">User 123</A>
			</nav>
			<main style={{ padding: "1rem" }}>{props.children}</main>
		</div>
	)
}
