<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/wadakatu/screenbook/main/assets/logo/logo.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/wadakatu/screenbook/main/assets/logo/logo-dark.svg">
    <img alt="Screenbook" src="https://raw.githubusercontent.com/wadakatu/screenbook/main/assets/logo/logo-dark.svg" height="48">
  </picture>
</p>

<p align="center">
  <strong>Define screens in code. Get an always-up-to-date catalog.</strong>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/wadakatu/screenbook/main/assets/screenshots/hero.png" alt="Screenbook Hero" width="800">
</p>

<p align="center">
  <a href="https://github.com/wadakatu/screenbook/actions/workflows/ci.yml"><img src="https://github.com/wadakatu/screenbook/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/wadakatu/screenbook"><img src="https://codecov.io/gh/wadakatu/screenbook/graph/badge.svg" alt="Coverage"></a>
  <a href="https://github.com/wadakatu/screenbook/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://github.com/wadakatu/screenbook"><img src="https://img.shields.io/badge/TypeScript-5.0+-blue.svg" alt="TypeScript"></a>
  <a href="https://github.com/wadakatu/screenbook"><img src="https://img.shields.io/badge/Node.js-22+-green.svg" alt="Node.js"></a>
</p>

<p align="center">
  <a href="https://wadakatu.github.io/screenbook">Documentation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#framework-support">Frameworks</a> •
  <a href="#why-screenbook">Why Screenbook?</a> •
  <a href="#cli-commands">CLI</a>
</p>

---

## Quick Start

```bash
# Install
npm i -D screenbook
# or
pnpm add -D screenbook

# Initialize configuration
npx screenbook init

# Start the UI
npx screenbook dev
```

Open http://localhost:4321 and explore your screen catalog.

**For full documentation, visit [wadakatu.github.io/screenbook](https://wadakatu.github.io/screenbook).**

---

## Defining Screens

Create `screen.meta.ts` files alongside your routes:

```ts
import { defineScreen } from "screenbook"

export const screen = defineScreen({
  id: "billing.invoices",           // Unique identifier
  title: "Invoice List",            // Human-readable name
  route: "/billing/invoices",       // URL path

  owner: ["billing-team"],          // Who owns this screen?
  tags: ["billing", "invoices"],    // For filtering

  next: [                           // Where can users go from here?
    "billing.invoice.detail",
    "billing.payments"
  ],

  dependsOn: [                      // What APIs does this screen call?
    "BillingAPI.listInvoices",
    "UserAPI.getCurrent"
  ],
})
```

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `screenbook init` | Initialize Screenbook in your project |
| `screenbook build` | Generate metadata JSON from screen definitions |
| `screenbook dev` | Start the UI server for local development |
| `screenbook lint` | Check for missing screen definitions (CI-friendly) |

---

## Why Screenbook?

Every team has a screen map somewhere — Figma, Notion, or buried in a wiki. **When was yours last updated?**

Sound familiar?

- "Where's the screen map?" → "Check Notion... or maybe the old Figma file?"
- "How do users get to the payment screen?" → *crickets*
- "Which screens use the BillingAPI?" → "Let me grep... actually, I'm not sure"

**Screen maps go stale because they live outside of code.** Screenbook keeps your screen documentation in sync — automatically.

| Traditional Approach | Screenbook |
|---------------------|------------|
| Screen maps in Figma/Notion go stale | Lives in code, always up-to-date |
| "Which screens use this API?" requires grep | Impact analysis in one click |
| New members lost in undocumented flows | Searchable, visual catalog |
| No way to enforce documentation | `screenbook lint` in CI |

---

## Framework Support

### File-based Routing ✅

| Framework | Status | Auto-generate |
|-----------|--------|---------------|
| **Next.js** (App Router) | ✅ Supported | ✅ |
| **Next.js** (Pages Router) | ✅ Supported | ✅ |
| **Nuxt** | ✅ Supported | ✅ |
| **Remix** | ✅ Supported | ✅ |
| **Astro** | ✅ Supported | ✅ |
| **SvelteKit** | ✅ Supported | ✅ |
| **SolidStart** | 🚧 Planned | 🚧 |
| **QwikCity** | 🚧 Planned | 🚧 |
| **TanStack Start** | 🚧 Planned | 🚧 |

### Config-based Routing 🚧

| Framework | Status | Auto-generate |
|-----------|--------|---------------|
| **React Router** | 🚧 Planned | 🚧 |
| **Vue Router** | 🚧 Planned | 🚧 |
| **Angular Router** | 🚧 Planned | 🚧 |
| **TanStack Router** | 🚧 Planned | 🚧 |
| **Solid Router** | 🚧 Planned | 🚧 |

> **Note:** Config-based routing support is coming soon! Track progress in [#107](https://github.com/wadakatu/screenbook/issues/107).
>
> Even without auto-generate, you can manually create `screen.meta.ts` files for any framework.

---

## CI Integration

Prevent documentation drift with a simple CI check:

```yaml
# .github/workflows/screenbook.yml
name: Screenbook
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-slim
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm screenbook lint
```

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
