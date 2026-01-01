import { Outlet, useParams } from "@tanstack/react-router"

export function User() {
	const { userId } = useParams({ from: "/users/$userId" })
	return (
		<div>
			<h1>User {userId}</h1>
			<Outlet />
		</div>
	)
}
