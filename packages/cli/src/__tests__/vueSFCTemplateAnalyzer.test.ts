import { describe, expect, it } from "vitest"
import { analyzeVueSFC } from "../utils/vueSFCTemplateAnalyzer.js"

describe("analyzeVueSFC", () => {
	describe("RouterLink detection (PascalCase)", () => {
		it("should detect RouterLink with static to attribute", () => {
			const content = `
<template>
  <RouterLink to="/users">Users</RouterLink>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("users")
			expect(result.templateNavigations.at(0)?.type).toBe("link")
		})

		it("should detect multiple RouterLinks", () => {
			const content = `
<template>
  <nav>
    <RouterLink to="/home">Home</RouterLink>
    <RouterLink to="/users">Users</RouterLink>
    <RouterLink to="/settings">Settings</RouterLink>
  </nav>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(3)
			expect(result.templateNavigations.map((n) => n.screenId)).toEqual([
				"home",
				"users",
				"settings",
			])
		})
	})

	describe("router-link detection (kebab-case)", () => {
		it("should detect router-link with static to attribute", () => {
			const content = `
<template>
  <router-link to="/dashboard">Dashboard</router-link>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("dashboard")
			expect(result.templateNavigations.at(0)?.type).toBe("link")
		})
	})

	describe("dynamic :to binding", () => {
		it("should detect :to with single-quoted static string", () => {
			const content = `
<template>
  <RouterLink :to="'/profile'">Profile</RouterLink>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("profile")
		})

		it("should detect :to with double-quoted static string", () => {
			const content = `
<template>
  <RouterLink :to='"/account"'>Account</RouterLink>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("account")
		})

		it("should detect :to with template literal without interpolation", () => {
			const content = `
<template>
  <RouterLink :to="\`/orders\`">Orders</RouterLink>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("orders")
		})

		it("should warn on :to with dynamic variable", () => {
			const content = `
<template>
  <RouterLink :to="dynamicPath">Dynamic</RouterLink>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(0)
			expect(result.warnings).toHaveLength(1)
			expect(result.warnings.at(0)).toContain("Dynamic :to binding")
			expect(result.warnings.at(0)).toContain("cannot be statically analyzed")
		})

		it("should warn on :to with template literal containing interpolation", () => {
			const content = `
<template>
  <RouterLink :to="\`/users/\${id}\`">User</RouterLink>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(0)
			expect(result.warnings).toHaveLength(1)
			expect(result.warnings.at(0)).toContain("Dynamic :to binding")
		})

		it("should warn on empty :to binding", () => {
			const content = `
<template>
  <RouterLink :to="">Empty</RouterLink>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(0)
			expect(result.warnings).toHaveLength(1)
			// Empty string is treated as a dynamic expression that cannot be analyzed
			expect(result.warnings.at(0)).toContain("Dynamic :to binding")
		})
	})

	describe("v-bind:to syntax", () => {
		it("should detect v-bind:to with static string", () => {
			const content = `
<template>
  <RouterLink v-bind:to="'/reports'">Reports</RouterLink>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("reports")
		})
	})

	describe("nested structures", () => {
		it("should detect RouterLink inside v-if", () => {
			const content = `
<template>
  <div v-if="isLoggedIn">
    <RouterLink to="/dashboard">Dashboard</RouterLink>
  </div>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("dashboard")
		})

		it("should detect RouterLink inside v-for", () => {
			const content = `
<template>
  <ul>
    <li v-for="item in items" :key="item.id">
      <RouterLink to="/items">Items</RouterLink>
    </li>
  </ul>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("items")
		})

		it("should detect RouterLink inside v-else", () => {
			const content = `
<template>
  <div v-if="isAdmin">
    <RouterLink to="/admin">Admin</RouterLink>
  </div>
  <div v-else>
    <RouterLink to="/user">User</RouterLink>
  </div>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(2)
			expect(result.templateNavigations.map((n) => n.screenId)).toContain(
				"admin",
			)
			expect(result.templateNavigations.map((n) => n.screenId)).toContain(
				"user",
			)
		})

		it("should detect deeply nested RouterLink", () => {
			const content = `
<template>
  <div>
    <header>
      <nav>
        <ul>
          <li>
            <RouterLink to="/deep">Deep Link</RouterLink>
          </li>
        </ul>
      </nav>
    </header>
  </div>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("deep")
		})
	})

	describe("path handling", () => {
		it("should skip external URLs", () => {
			const content = `
<template>
  <RouterLink to="https://example.com">External</RouterLink>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(0)
		})

		it("should convert nested paths to dot notation screenId", () => {
			const content = `
<template>
  <RouterLink to="/billing/invoices">Invoices</RouterLink>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe(
				"billing.invoices",
			)
		})

		it("should handle paths with parameters", () => {
			const content = `
<template>
  <RouterLink to="/users/:id">User Detail</RouterLink>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(1)
			// pathToScreenId converts :id to id (strips the colon)
			expect(result.templateNavigations.at(0)?.screenId).toBe("users.id")
		})

		it("should skip hash-only links", () => {
			const content = `
<template>
  <RouterLink to="#section">Jump to Section</RouterLink>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(0)
		})
	})

	describe("deduplication", () => {
		it("should deduplicate template navigations with same screenId", () => {
			const content = `
<template>
  <RouterLink to="/home">Home 1</RouterLink>
  <RouterLink to="/home">Home 2</RouterLink>
  <router-link to="/home">Home 3</router-link>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.templateNavigations.at(0)?.screenId).toBe("home")
		})
	})

	describe("script detection", () => {
		it("should detect router.push() in script setup", () => {
			const content = `
<script setup lang="ts">
import { useRouter } from "vue-router"

const router = useRouter()

function navigate() {
  router.push("/settings")
}
</script>

<template>
  <button @click="navigate">Go to Settings</button>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.scriptNavigations).toHaveLength(1)
			expect(result.scriptNavigations.at(0)?.screenId).toBe("settings")
			expect(result.scriptNavigations.at(0)?.type).toBe("router-push")
		})

		it("should detect router.replace() in script setup", () => {
			const content = `
<script setup lang="ts">
import { useRouter } from "vue-router"

const router = useRouter()

function navigate() {
  router.replace("/dashboard")
}
</script>

<template>
  <div></div>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.scriptNavigations).toHaveLength(1)
			expect(result.scriptNavigations.at(0)?.screenId).toBe("dashboard")
			// Note: router.replace is also categorized as "router-push" type
			expect(result.scriptNavigations.at(0)?.type).toBe("router-push")
		})
	})

	describe("template + script combined", () => {
		it("should detect navigations from both template and script", () => {
			const content = `
<script setup lang="ts">
import { RouterLink, useRouter } from "vue-router"

const router = useRouter()

function goToSettings() {
  router.push("/settings")
}
</script>

<template>
  <nav>
    <RouterLink to="/home">Home</RouterLink>
    <RouterLink to="/users">Users</RouterLink>
    <button @click="goToSettings">Settings</button>
  </nav>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

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
<template>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(0)
			expect(result.scriptNavigations).toHaveLength(0)
			expect(result.warnings).toHaveLength(0)
		})

		it("should handle template with only text", () => {
			const content = `
<template>
  Hello World
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(0)
		})

		it("should handle invalid Vue SFC gracefully", () => {
			const content = "this is not valid Vue SFC"
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(0)
			expect(result.scriptNavigations).toHaveLength(0)
		})

		it("should report SFC parse errors as warnings", () => {
			const content = `
<template>
  <div
  <!-- unclosed tag triggers parse error -->
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.warnings.length).toBeGreaterThan(0)
			expect(result.warnings.some((w) => w.includes("SFC parse error"))).toBe(
				true,
			)
		})

		it("should handle SFC without template section", () => {
			const content = `
<script setup lang="ts">
import { useRouter } from "vue-router"

const router = useRouter()
router.push("/dashboard")
</script>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(0)
			expect(result.scriptNavigations).toHaveLength(1)
			expect(result.scriptNavigations.at(0)?.screenId).toBe("dashboard")
		})

		it("should handle SFC without script section", () => {
			const content = `
<template>
  <RouterLink to="/about">About</RouterLink>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(1)
			expect(result.scriptNavigations).toHaveLength(0)
		})

		it("should handle RouterLink without to attribute", () => {
			const content = `
<template>
  <RouterLink>No destination</RouterLink>
</template>
`
			const result = analyzeVueSFC(content, "test.vue")

			expect(result.templateNavigations).toHaveLength(0)
		})
	})
})
