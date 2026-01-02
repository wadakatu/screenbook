import { useParams } from "@solidjs/router"

export default function User() {
	const params = useParams()

	return (
		<div>
			<h1>User Profile</h1>
			<p>User ID: {params.userId}</p>
		</div>
	)
}
