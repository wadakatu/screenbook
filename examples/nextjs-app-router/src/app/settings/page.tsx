import Link from "next/link"

export default function Settings() {
	return (
		<main style={{ padding: "2rem" }}>
			<h1>Settings</h1>
			<p>Manage your account settings and preferences.</p>

			<section style={{ marginTop: "2rem" }}>
				<h2>Account</h2>
				<form>
					<div style={{ marginBottom: "1rem" }}>
						<label htmlFor="name">Name</label>
						<br />
						<input type="text" id="name" defaultValue="John Doe" />
					</div>
					<div style={{ marginBottom: "1rem" }}>
						<label htmlFor="email">Email</label>
						<br />
						<input type="email" id="email" defaultValue="john@example.com" />
					</div>
					<button type="submit">Save Changes</button>
				</form>
			</section>

			<nav style={{ marginTop: "2rem" }}>
				<Link href="/">Back to Home</Link>
				{" | "}
				<Link href="/dashboard">Dashboard</Link>
			</nav>
		</main>
	)
}
