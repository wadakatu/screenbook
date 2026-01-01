import { useParams } from "@tanstack/react-router"

export function UserProfile() {
	const { userId } = useParams({ from: "/users/$userId/profile" })
	return (
		<div>
			<h2>Profile</h2>
			<p>Viewing profile for user {userId}</p>
		</div>
	)
}
