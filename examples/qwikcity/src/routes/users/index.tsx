import { component$ } from "@builder.io/qwik"
import { Link } from "@builder.io/qwik-city"

const users = [
	{ id: 1, name: "Alice" },
	{ id: 2, name: "Bob" },
	{ id: 3, name: "Charlie" },
]

export default component$(() => {
	return (
		<>
			<h1>Users</h1>
			<ul>
				{users.map((user) => (
					<li key={user.id}>
						<Link href={`/users/${user.id}`}>{user.name}</Link>
					</li>
				))}
			</ul>
			<Link href="/">Back to Home</Link>
		</>
	)
})
