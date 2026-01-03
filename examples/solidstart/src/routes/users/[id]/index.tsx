import { A, useParams } from "@solidjs/router"

export default function UserDetail() {
	const params = useParams()

	return (
		<main>
			<h1>User Detail</h1>
			<p>Viewing user with ID: {params.id}</p>
			<A href="/users">Back to Users</A>
		</main>
	)
}
