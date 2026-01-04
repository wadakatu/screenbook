import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { analyzeAngularComponent } from "../utils/angularTemplateAnalyzer.js"

describe("analyzeAngularComponent", () => {
	describe("static routerLink attribute", () => {
		it("should detect routerLink with static path", () => {
			const content = `
import { Component } from "@angular/core"
import { RouterLink } from "@angular/router"

@Component({
  selector: "app-nav",
  standalone: true,
  imports: [RouterLink],
  template: \`<a routerLink="/users">Users</a>\`
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("users")
			expect(result.templateNavigations.at(0)?.type).toBe("link")
		})

		it("should detect multiple routerLinks", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  template: \`
    <nav>
      <a routerLink="/home">Home</a>
      <a routerLink="/users">Users</a>
      <a routerLink="/settings">Settings</a>
    </nav>
  \`
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(3)
			expect(result.templateNavigations.map((n) => n.screenId)).toEqual([
				"home",
				"users",
				"settings",
			])
		})
	})

	describe("[routerLink] property binding", () => {
		it("should detect [routerLink] with single-quoted string", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  template: \`<a [routerLink]="'/profile'">Profile</a>\`
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("profile")
		})

		it("should detect [routerLink] with double-quoted string", () => {
			// Using double-quoted inner string: [routerLink]='"/account"'
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  template: \`<a [routerLink]='"/account"'>Account</a>\`
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("account")
		})

		it("should detect [routerLink] with array literal", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  template: \`<a [routerLink]="['/users']">Users</a>\`
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("users")
		})

		it("should detect [routerLink] with array containing params", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  template: \`<a [routerLink]="['/users', userId]">User Detail</a>\`
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("users")
		})

		it("should warn on [routerLink] with dynamic variable", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  template: \`<a [routerLink]="dynamicPath">Dynamic</a>\`
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(0)
			expect(result.warnings).toHaveLength(1)
			expect(result.warnings.at(0)).toContain("Dynamic [routerLink] binding")
			expect(result.warnings.at(0)).toContain("cannot be statically analyzed")
		})

		it("should warn on empty [routerLink] binding", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  template: \`<a [routerLink]="">Empty</a>\`
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(0)
			expect(result.warnings).toHaveLength(1)
			expect(result.warnings.at(0)).toContain("Empty [routerLink] binding")
		})
	})

	describe("nested structures", () => {
		it("should detect routerLink inside *ngIf", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  template: \`
    <div *ngIf="isLoggedIn">
      <a routerLink="/dashboard">Dashboard</a>
    </div>
  \`
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("dashboard")
		})

		it("should detect routerLink inside *ngFor", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  template: \`
    <ul>
      <li *ngFor="let item of items">
        <a routerLink="/items">Items</a>
      </li>
    </ul>
  \`
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("items")
		})

		it("should detect deeply nested routerLink", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  template: \`
    <div>
      <header>
        <nav>
          <ul>
            <li>
              <a routerLink="/deep">Deep Link</a>
            </li>
          </ul>
        </nav>
      </header>
    </div>
  \`
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("deep")
		})
	})

	describe("path handling", () => {
		it("should skip external URLs", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  template: \`<a routerLink="https://example.com">External</a>\`
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(0)
		})

		it("should convert nested paths to dot notation screenId", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  template: \`<a routerLink="/billing/invoices">Invoices</a>\`
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe(
				"billing.invoices",
			)
		})
	})

	describe("deduplication", () => {
		it("should deduplicate template navigations with same screenId", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  template: \`
    <a routerLink="/home">Home 1</a>
    <a routerLink="/home">Home 2</a>
    <a [routerLink]="'/home'">Home 3</a>
  \`
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("home")
		})
	})

	describe("script detection", () => {
		it("should detect router.navigate() in component", () => {
			const content = `
import { Component } from "@angular/core"
import { Router } from "@angular/router"

@Component({
  selector: "app-nav",
  template: \`<button (click)="navigate()">Go</button>\`
})
export class NavComponent {
  constructor(private router: Router) {}

  navigate() {
    this.router.navigate(["/settings"])
  }
}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.scriptNavigations).toHaveLength(1)
			expect(result.scriptNavigations.at(0)?.screenId).toBe("settings")
			expect(result.scriptNavigations.at(0)?.type).toBe("navigate")
		})

		it("should detect router.navigateByUrl() in component", () => {
			const content = `
import { Component } from "@angular/core"
import { Router } from "@angular/router"

@Component({
  selector: "app-nav",
  template: \`<div></div>\`
})
export class NavComponent {
  constructor(private router: Router) {}

  navigate() {
    this.router.navigateByUrl("/dashboard")
  }
}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.scriptNavigations).toHaveLength(1)
			expect(result.scriptNavigations.at(0)?.screenId).toBe("dashboard")
			expect(result.scriptNavigations.at(0)?.type).toBe("navigate-by-url")
		})
	})

	describe("template + script combined", () => {
		it("should detect navigations from both template and script", () => {
			const content = `
import { Component } from "@angular/core"
import { Router, RouterLink } from "@angular/router"

@Component({
  selector: "app-nav",
  standalone: true,
  imports: [RouterLink],
  template: \`
    <nav>
      <a routerLink="/home">Home</a>
      <a routerLink="/users">Users</a>
      <button (click)="goToSettings()">Settings</button>
    </nav>
  \`
})
export class NavComponent {
  constructor(private router: Router) {}

  goToSettings() {
    this.router.navigate(["/settings"])
  }
}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(2)
			expect(result.templateNavigations.map((n) => n.screenId)).toEqual([
				"home",
				"users",
			])

			expect(result.scriptNavigations).toHaveLength(1)
			expect(result.scriptNavigations.at(0)?.screenId).toBe("settings")
		})
	})

	describe("edge cases", () => {
		it("should handle empty template", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-empty",
  template: \`\`
})
export class EmptyComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"empty.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(0)
			expect(result.scriptNavigations).toHaveLength(0)
			expect(result.warnings).toHaveLength(0)
		})

		it("should handle template with only text", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-text",
  template: \`Hello World\`
})
export class TextComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"text.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(0)
		})

		it("should handle component without @Component decorator", () => {
			const content = `
export class NotAComponent {
  navigate() {
    console.log("not a component")
  }
}
`
			const result = analyzeAngularComponent(
				content,
				"not.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(0)
			expect(result.scriptNavigations).toHaveLength(0)
		})

		it("should handle component without template property", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-no-template"
})
export class NoTemplateComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"no-template.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(0)
		})

		it("should report parse errors as warnings", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-broken",
  template: \`<div
})
export class BrokenComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"broken.component.ts",
				"/app",
			)

			expect(result.warnings.length).toBeGreaterThan(0)
		})
	})

	describe("templateUrl (external template)", () => {
		const testDir = join(process.cwd(), "__test-templates__")
		const templatePath = join(testDir, "nav.component.html")

		beforeAll(() => {
			if (!existsSync(testDir)) {
				mkdirSync(testDir, { recursive: true })
			}
			writeFileSync(
				templatePath,
				`<nav>
  <a routerLink="/home">Home</a>
  <a routerLink="/about">About</a>
</nav>`,
			)
		})

		afterAll(() => {
			rmSync(testDir, { recursive: true, force: true })
		})

		it("should detect routerLink in external template", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  templateUrl: "./nav.component.html"
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				join(testDir, "nav.component.ts"),
				testDir,
			)

			expect(result.templateNavigations).toHaveLength(2)
			expect(result.templateNavigations.map((n) => n.screenId)).toEqual([
				"home",
				"about",
			])
		})

		it("should warn on missing templateUrl and return empty navigations", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  templateUrl: "./missing.component.html"
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				join(testDir, "nav.component.ts"),
				testDir,
			)

			// Should not crash, returns empty navigations with warning
			expect(result.templateNavigations).toHaveLength(0)
			expect(result.warnings).toHaveLength(1)
			expect(result.warnings.at(0)).toContain("Template file not found")
			expect(result.warnings.at(0)).toContain("missing.component.html")
		})
	})

	describe("edge case: array literal with double quotes", () => {
		it("should detect [routerLink] with double-quoted path in array", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  template: \`<a [routerLink]='["/users"]'>Users</a>\`
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("users")
		})
	})

	describe("edge case: comma inside quoted string", () => {
		it("should handle path with comma inside string in array", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  template: \`<a [routerLink]="['/path-with,comma']">Link</a>\`
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.path).toBe("/path-with,comma")
		})

		it("should correctly split array with multiple elements containing commas in values", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  template: \`<a [routerLink]="['/users', 'param,with,commas']">Link</a>\`
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("users")
		})
	})

	describe("edge case: query params and hash", () => {
		it("should strip query parameters from path when generating screenId", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  template: \`<a routerLink="/users?tab=active">Users</a>\`
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("users")
			expect(result.templateNavigations.at(0)?.path).toBe("/users?tab=active")
		})

		it("should strip hash fragment from path when generating screenId", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  template: \`<a routerLink="/users#section">Users</a>\`
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("users")
		})
	})

	describe("edge case: single-quoted inline template", () => {
		it("should detect routerLink in single-quoted inline template", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: 'app-nav',
  template: '<a routerLink="/home">Home</a>'
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("home")
		})
	})

	describe("edge case: relative paths", () => {
		it("should warn on relative paths without leading slash", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  template: \`<a routerLink="users">Users</a>\`
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(0)
			expect(result.warnings).toHaveLength(1)
			expect(result.warnings.at(0)).toContain("relative path")
			expect(result.warnings.at(0)).toContain("should start with '/'")
		})

		it("should warn on relative path in [routerLink] binding", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  template: \`<a [routerLink]="'users'">Users</a>\`
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			expect(result.templateNavigations).toHaveLength(0)
			expect(result.warnings).toHaveLength(1)
			expect(result.warnings.at(0)).toContain("relative path")
		})

		it("should skip mailto and tel links without warning", () => {
			const content = `
import { Component } from "@angular/core"

@Component({
  selector: "app-nav",
  template: \`
    <a routerLink="mailto:user@example.com">Email</a>
    <a routerLink="tel:+1234567890">Call</a>
    <a routerLink="/contact">Contact</a>
  \`
})
export class NavComponent {}
`
			const result = analyzeAngularComponent(
				content,
				"nav.component.ts",
				"/app",
			)

			// Only /contact should be detected, mailto/tel are external
			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("contact")
			// mailto/tel links are skipped without warning (they're not relative paths)
		})
	})
})
