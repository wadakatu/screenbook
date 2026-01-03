import { component$ } from "@builder.io/qwik"
import { Link } from "@builder.io/qwik-city"

export default component$(() => {
	return (
		<>
			<h1>Welcome to QwikCity</h1>
			<p>This is a QwikCity example with Screenbook integration.</p>
			<nav>
				<ul>
					<li>
						<Link href="/about">About</Link>
					</li>
					<li>
						<Link href="/users">Users</Link>
					</li>
				</ul>
			</nav>
		</>
	)
})
