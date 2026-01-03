import { component$ } from "@builder.io/qwik"
import { Link, useLocation } from "@builder.io/qwik-city"

export default component$(() => {
	const loc = useLocation()

	return (
		<>
			<h1>User Detail</h1>
			<p>Viewing user with ID: {loc.params.id}</p>
			<Link href="/users">Back to Users</Link>
		</>
	)
})
