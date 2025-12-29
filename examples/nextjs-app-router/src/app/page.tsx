import Link from "next/link"

export default function Home() {
	return (
		<main style={{ padding: "2rem" }}>
			<h1>Home</h1>
			<p>Welcome to the Next.js App Router example with Screenbook.</p>
			<nav style={{ marginTop: "1rem" }}>
				<ul>
					<li>
						<Link href="/dashboard">Dashboard</Link>
					</li>
					<li>
						<Link href="/settings">Settings</Link>
					</li>
				</ul>
			</nav>
		</main>
	)
}
