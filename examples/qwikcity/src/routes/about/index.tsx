import { component$ } from "@builder.io/qwik"
import { Link } from "@builder.io/qwik-city"

export default component$(() => {
	return (
		<>
			<h1>About</h1>
			<p>This is a simple QwikCity application demonstrating Screenbook.</p>
			<Link href="/">Back to Home</Link>
		</>
	)
})
