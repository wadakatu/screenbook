import { describe, expect, it } from "vitest"
import {
	analyzeNavigation,
	detectNavigationFramework,
	mergeNext,
} from "../utils/navigationAnalyzer.js"

describe("analyzeNavigation", () => {
	describe("Next.js patterns", () => {
		it("should detect Link with href attribute", () => {
			const content = `
import Link from "next/link"

export function Navigation() {
  return <Link href="/users">Users</Link>
}
`
			const result = analyzeNavigation(content, "nextjs")

			expect(result.navigations).toHaveLength(1)
			expect(result.navigations.at(0)).toEqual({
				path: "/users",
				screenId: "users",
				type: "link",
				line: 5,
			})
			expect(result.warnings).toHaveLength(0)
		})

		it("should detect multiple Link components", () => {
			const content = `
import Link from "next/link"

export function Navigation() {
  return (
    <nav>
      <Link href="/users">Users</Link>
      <Link href="/settings">Settings</Link>
      <Link href="/about">About</Link>
    </nav>
  )
}
`
			const result = analyzeNavigation(content, "nextjs")

			expect(result.navigations).toHaveLength(3)
			expect(result.navigations.map((n) => n.screenId)).toEqual([
				"users",
				"settings",
				"about",
			])
		})

		it("should detect router.push calls", () => {
			const content = `
import { useRouter } from "next/navigation"

export function Button() {
  const router = useRouter()
  return <button onClick={() => router.push("/dashboard")}>Go</button>
}
`
			const result = analyzeNavigation(content, "nextjs")

			expect(result.navigations).toHaveLength(1)
			expect(result.navigations.at(0)?.path).toBe("/dashboard")
			expect(result.navigations.at(0)?.screenId).toBe("dashboard")
			expect(result.navigations.at(0)?.type).toBe("router-push")
		})

		it("should detect redirect calls", () => {
			const content = `
import { redirect } from "next/navigation"

export async function Page() {
  if (!isAuthenticated) {
    redirect("/login")
  }
}
`
			const result = analyzeNavigation(content, "nextjs")

			expect(result.navigations).toHaveLength(1)
			expect(result.navigations.at(0)?.path).toBe("/login")
			expect(result.navigations.at(0)?.screenId).toBe("login")
			expect(result.navigations.at(0)?.type).toBe("redirect")
		})

		it("should convert nested paths to screen IDs", () => {
			const content = `
import Link from "next/link"

export function Links() {
  return (
    <>
      <Link href="/users/profile">Profile</Link>
      <Link href="/billing/invoices">Invoices</Link>
    </>
  )
}
`
			const result = analyzeNavigation(content, "nextjs")

			expect(result.navigations).toHaveLength(2)
			expect(result.navigations.at(0)?.screenId).toBe("users.profile")
			expect(result.navigations.at(1)?.screenId).toBe("billing.invoices")
		})

		it("should convert dynamic paths to screen IDs", () => {
			const content = `
import Link from "next/link"

export function UserLink() {
  return <Link href="/users/:id/profile">Profile</Link>
}
`
			const result = analyzeNavigation(content, "nextjs")

			expect(result.navigations).toHaveLength(1)
			expect(result.navigations.at(0)?.screenId).toBe("users.id.profile")
		})

		it("should skip external URLs", () => {
			const content = `
import Link from "next/link"

export function Links() {
  return (
    <>
      <Link href="https://example.com">External</Link>
      <Link href="http://example.com">External HTTP</Link>
      <Link href="//example.com">Protocol-relative</Link>
      <Link href="/internal">Internal</Link>
    </>
  )
}
`
			const result = analyzeNavigation(content, "nextjs")

			expect(result.navigations).toHaveLength(1)
			expect(result.navigations.at(0)?.path).toBe("/internal")
		})

		it("should skip hash-only links", () => {
			const content = `
import Link from "next/link"

export function HashLink() {
  return <Link href="#section">Jump</Link>
}
`
			const result = analyzeNavigation(content, "nextjs")

			expect(result.navigations).toHaveLength(0)
		})

		it("should skip mailto and tel links", () => {
			const content = `
import Link from "next/link"

export function ContactLinks() {
  return (
    <>
      <Link href="mailto:test@example.com">Email</Link>
      <Link href="tel:+1234567890">Phone</Link>
    </>
  )
}
`
			const result = analyzeNavigation(content, "nextjs")

			expect(result.navigations).toHaveLength(0)
		})

		it("should warn on dynamic href expressions", () => {
			const content = `
import Link from "next/link"

export function DynamicLink({ path }) {
  return <Link href={path}>Dynamic</Link>
}
`
			const result = analyzeNavigation(content, "nextjs")

			expect(result.navigations).toHaveLength(0)
			expect(result.warnings).toHaveLength(1)
			expect(result.warnings[0]).toContain("Dynamic Link href")
			expect(result.warnings[0]).toContain("cannot be statically analyzed")
		})

		it("should handle href with JSX expression containing string literal", () => {
			const content = `
import Link from "next/link"

export function Links() {
  return <Link href={"/users"}>Users</Link>
}
`
			const result = analyzeNavigation(content, "nextjs")

			expect(result.navigations).toHaveLength(1)
			expect(result.navigations.at(0)?.path).toBe("/users")
		})

		it("should handle static template literal", () => {
			const content = `
import Link from "next/link"

export function Links() {
  return <Link href={\`/settings\`}>Settings</Link>
}
`
			const result = analyzeNavigation(content, "nextjs")

			expect(result.navigations).toHaveLength(1)
			expect(result.navigations.at(0)?.path).toBe("/settings")
		})

		it("should handle root path", () => {
			const content = `
import Link from "next/link"

export function HomeLink() {
  return <Link href="/">Home</Link>
}
`
			const result = analyzeNavigation(content, "nextjs")

			expect(result.navigations).toHaveLength(1)
			expect(result.navigations.at(0)?.path).toBe("/")
			expect(result.navigations.at(0)?.screenId).toBe("home")
		})
	})

	describe("React Router patterns", () => {
		it("should detect Link with to attribute", () => {
			const content = `
import { Link } from "react-router-dom"

export function Navigation() {
  return <Link to="/settings">Settings</Link>
}
`
			const result = analyzeNavigation(content, "react-router")

			expect(result.navigations).toHaveLength(1)
			expect(result.navigations.at(0)?.path).toBe("/settings")
			expect(result.navigations.at(0)?.type).toBe("link")
		})

		it("should detect navigate calls", () => {
			const content = `
import { useNavigate } from "react-router-dom"

export function Button() {
  const navigate = useNavigate()
  return <button onClick={() => navigate("/home")}>Home</button>
}
`
			const result = analyzeNavigation(content, "react-router")

			expect(result.navigations).toHaveLength(1)
			expect(result.navigations.at(0)?.path).toBe("/home")
			expect(result.navigations.at(0)?.screenId).toBe("home")
			expect(result.navigations.at(0)?.type).toBe("navigate")
		})

		it("should not detect href attribute for React Router", () => {
			const content = `
import { Link } from "react-router-dom"

export function Navigation() {
  return <Link href="/wrong" to="/correct">Link</Link>
}
`
			const result = analyzeNavigation(content, "react-router")

			expect(result.navigations).toHaveLength(1)
			expect(result.navigations.at(0)?.path).toBe("/correct")
		})
	})

	describe("edge cases", () => {
		it("should handle multiple navigation patterns in one file", () => {
			const content = `
import Link from "next/link"
import { useRouter } from "next/navigation"

export function Page() {
  const router = useRouter()

  return (
    <>
      <Link href="/users">Users</Link>
      <Link href="/settings">Settings</Link>
      <button onClick={() => router.push("/dashboard")}>Dashboard</button>
    </>
  )
}
`
			const result = analyzeNavigation(content, "nextjs")

			expect(result.navigations).toHaveLength(3)
			expect(result.navigations.map((n) => n.screenId).sort()).toEqual([
				"dashboard",
				"settings",
				"users",
			])
		})

		it("should deduplicate same navigation targets", () => {
			const content = `
import Link from "next/link"

export function Page() {
  return (
    <>
      <Link href="/users">Users 1</Link>
      <Link href="/users">Users 2</Link>
      <Link href="/users">Users 3</Link>
    </>
  )
}
`
			const result = analyzeNavigation(content, "nextjs")

			expect(result.navigations).toHaveLength(1)
			expect(result.navigations.at(0)?.screenId).toBe("users")
		})

		it("should handle syntax errors gracefully", () => {
			const content = `
import Link from "next/link"
<Link href="/broken  // syntax error
`
			const result = analyzeNavigation(content, "nextjs")

			expect(result.navigations).toHaveLength(0)
			expect(result.warnings).toHaveLength(1)
			expect(result.warnings[0]).toContain("Syntax error")
		})

		it("should return empty result for file with no navigation", () => {
			const content = `
export function Component() {
  return <div>No navigation here</div>
}
`
			const result = analyzeNavigation(content, "nextjs")

			expect(result.navigations).toHaveLength(0)
			expect(result.warnings).toHaveLength(0)
		})

		it("should ignore non-Link components", () => {
			const content = `
import Button from "./Button"

export function Page() {
  return <Button href="/not-a-link">Click</Button>
}
`
			const result = analyzeNavigation(content, "nextjs")

			expect(result.navigations).toHaveLength(0)
		})

		it("should handle JSX files", () => {
			const content = `
import Link from "next/link"

export function UserList() {
  return (
    <div className="users">
      {users.map(u => (
        <Link key={u.id} href="/users/detail">
          <span>{u.name}</span>
        </Link>
      ))}
    </div>
  )
}
`
			const result = analyzeNavigation(content, "nextjs")

			expect(result.navigations).toHaveLength(1)
			expect(result.navigations.at(0)?.path).toBe("/users/detail")
		})
	})
})

describe("mergeNext", () => {
	it("should merge existing and detected navigation", () => {
		const existing = ["manual.screen.1", "manual.screen.2"]
		const detected = [
			{ path: "/users", screenId: "users", type: "link" as const, line: 1 },
		]

		const result = mergeNext(existing, detected)

		expect(result).toEqual(["manual.screen.1", "manual.screen.2", "users"])
	})

	it("should remove duplicates", () => {
		const existing = ["users", "settings"]
		const detected = [
			{ path: "/users", screenId: "users", type: "link" as const, line: 1 },
		]

		const result = mergeNext(existing, detected)

		expect(result).toEqual(["settings", "users"])
	})

	it("should return sorted array", () => {
		const existing = ["z.screen"]
		const detected = [
			{ path: "/a", screenId: "a.screen", type: "link" as const, line: 1 },
			{ path: "/m", screenId: "m.screen", type: "link" as const, line: 2 },
		]

		const result = mergeNext(existing, detected)

		expect(result).toEqual(["a.screen", "m.screen", "z.screen"])
	})

	it("should handle empty existing array", () => {
		const existing: string[] = []
		const detected = [
			{ path: "/users", screenId: "users", type: "link" as const, line: 1 },
		]

		const result = mergeNext(existing, detected)

		expect(result).toEqual(["users"])
	})

	it("should handle empty detected array", () => {
		const existing = ["manual.screen"]
		const detected: never[] = []

		const result = mergeNext(existing, detected)

		expect(result).toEqual(["manual.screen"])
	})
})

describe("detectNavigationFramework", () => {
	it("should detect Next.js from next/link import", () => {
		const content = `import Link from "next/link"`
		expect(detectNavigationFramework(content)).toBe("nextjs")
	})

	it("should detect Next.js from next/navigation import", () => {
		const content = `import { useRouter } from "next/navigation"`
		expect(detectNavigationFramework(content)).toBe("nextjs")
	})

	it("should detect Next.js from next/router import", () => {
		const content = `import { useRouter } from "next/router"`
		expect(detectNavigationFramework(content)).toBe("nextjs")
	})

	it("should detect React Router from react-router import", () => {
		const content = `import { Link } from "react-router-dom"`
		expect(detectNavigationFramework(content)).toBe("react-router")
	})

	it("should detect React Router from useNavigate", () => {
		const content = `const navigate = useNavigate()`
		expect(detectNavigationFramework(content)).toBe("react-router")
	})

	it("should detect React Router from @remix-run/react import", () => {
		const content = `import { Link } from "@remix-run/react"`
		expect(detectNavigationFramework(content)).toBe("react-router")
	})

	it("should default to Next.js for unknown content", () => {
		const content = `export function Component() { return <div>Hello</div> }`
		expect(detectNavigationFramework(content)).toBe("nextjs")
	})
})
