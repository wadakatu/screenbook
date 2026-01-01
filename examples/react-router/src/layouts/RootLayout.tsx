import { Link, Outlet } from "react-router-dom"

export function RootLayout() {
	return (
		<div>
			<nav>
				<ul>
					<li>
						<Link to="/">Home</Link>
					</li>
					<li>
						<Link to="/dashboard">Dashboard</Link>
					</li>
					<li>
						<Link to="/settings">Settings</Link>
					</li>
					<li>
						<Link to="/users/1">User 1</Link>
					</li>
				</ul>
			</nav>
			<main>
				<Outlet />
			</main>
		</div>
	)
}
