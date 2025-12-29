import { Link } from "react-router-dom"

export default function Home() {
	return (
		<main style={{ padding: "2rem" }}>
			<h1>Home</h1>
			<p>Welcome to the Vite + React example with Screenbook.</p>
			<nav style={{ marginTop: "1rem" }}>
				<ul>
					<li>
						<Link to="/dashboard">Dashboard</Link>
					</li>
					<li>
						<Link to="/settings">Settings</Link>
					</li>
				</ul>
			</nav>
		</main>
	)
}
