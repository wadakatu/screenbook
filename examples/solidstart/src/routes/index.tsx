import { A } from "@solidjs/router"

export default function Home() {
	return (
		<main>
			<h1>Welcome to SolidStart</h1>
			<p>This is a SolidStart example with Screenbook integration.</p>
			<nav>
				<ul>
					<li>
						<A href="/about">About</A>
					</li>
					<li>
						<A href="/users">Users</A>
					</li>
				</ul>
			</nav>
		</main>
	)
}
