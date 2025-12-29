import Link from "next/link"

export default function Dashboard() {
	return (
		<main style={{ padding: "2rem" }}>
			<h1>Dashboard</h1>
			<p>View your analytics and metrics here.</p>

			<section style={{ marginTop: "2rem" }}>
				<h2>Quick Stats</h2>
				<div style={{ display: "flex", gap: "1rem" }}>
					<div
						style={{
							padding: "1rem",
							border: "1px solid #ccc",
							borderRadius: "8px",
						}}
					>
						<h3>Users</h3>
						<p>1,234</p>
					</div>
					<div
						style={{
							padding: "1rem",
							border: "1px solid #ccc",
							borderRadius: "8px",
						}}
					>
						<h3>Revenue</h3>
						<p>$12,345</p>
					</div>
				</div>
			</section>

			<nav style={{ marginTop: "2rem" }}>
				<Link href="/">Back to Home</Link>
				{" | "}
				<Link href="/settings">Settings</Link>
			</nav>
		</main>
	)
}
