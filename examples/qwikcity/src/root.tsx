import { component$ } from "@builder.io/qwik"
import {
	QwikCityProvider,
	RouterOutlet,
	ServiceWorkerRegister,
} from "@builder.io/qwik-city"

import "./global.css"

export default component$(() => {
	return (
		<QwikCityProvider>
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<link rel="manifest" href="/manifest.json" />
				<title>QwikCity Example</title>
				<ServiceWorkerRegister />
			</head>
			<body>
				<RouterOutlet />
			</body>
		</QwikCityProvider>
	)
})
