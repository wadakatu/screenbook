import { Router } from "@solidjs/router"
import { render } from "solid-js/web"
import App from "./App"
import { routes } from "./router/routes"

const rootElement = document.getElementById("root")
if (rootElement) {
	render(() => <Router root={App}>{routes}</Router>, rootElement)
}
