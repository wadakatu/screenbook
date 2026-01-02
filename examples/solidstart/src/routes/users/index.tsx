import { A } from "@solidjs/router"
import { For } from "solid-js"

const users = [
	{ id: 1, name: "Alice" },
	{ id: 2, name: "Bob" },
	{ id: 3, name: "Charlie" },
]

export default function Users() {
	return (
		<main>
			<h1>Users</h1>
			<ul>
				<For each={users}>
					{(user) => (
						<li>
							<A href={`/users/${user.id}`}>{user.name}</A>
						</li>
					)}
				</For>
			</ul>
			<A href="/">Back to Home</A>
		</main>
	)
}
