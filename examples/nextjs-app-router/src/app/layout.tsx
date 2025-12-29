import type { Metadata } from "next"

export const metadata: Metadata = {
	title: "Next.js App Router Example",
	description: "Screenbook integration with Next.js App Router",
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	)
}
