import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/users/")({
	component: UsersPage,
})

function UsersPage() {
	const users = [
		{ id: "1", name: "Alice" },
		{ id: "2", name: "Bob" },
		{ id: "3", name: "Charlie" },
	]

	return (
		<div>
			<h1>Users</h1>
			<ul>
				{users.map((user) => (
					<li key={user.id}>
						<Link to="/users/$id" params={{ id: user.id }}>
							{user.name}
						</Link>
					</li>
				))}
			</ul>
		</div>
	)
}
