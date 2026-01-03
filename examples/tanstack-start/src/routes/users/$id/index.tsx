import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/users/$id/")({
	component: UserDetailPage,
})

function UserDetailPage() {
	const { id } = Route.useParams()

	return (
		<div>
			<h1>User Detail</h1>
			<p>User ID: {id}</p>
		</div>
	)
}
