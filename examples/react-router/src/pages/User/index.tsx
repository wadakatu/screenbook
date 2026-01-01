import { Outlet, useParams } from "react-router-dom"

export function User() {
	const { id } = useParams<{ id: string }>()

	return (
		<div>
			<h1>User {id}</h1>
			<p>User details page.</p>
			<Outlet />
		</div>
	)
}
