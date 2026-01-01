import { useParams } from "react-router-dom"

export function UserProfile() {
	const { id } = useParams<{ id: string }>()

	return (
		<div>
			<h2>Profile for User {id}</h2>
			<p>Extended profile information.</p>
		</div>
	)
}
