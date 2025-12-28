<p align="center">
  <img src="assets/screenshots/hero.png" alt="Screenbook - Define screens in code, get an always-up-to-date catalog" width="800">
</p>

<h1 align="center">Screenbook</h1>

<p align="center">
  <strong>Your screen map is out of date. Again.</strong>
</p>

## The Problem

Every team has a screen map somewhere. FigJam, Figma, Notion...

**When was it last updated?**

- New members can't trust it for onboarding
- "How do users get to this screen?" — no one knows
- Changing an API? Good luck figuring out what breaks

## The Solution

**Define screens in code. Get an always-up-to-date catalog.**

```ts
// src/pages/billing/invoices/screen.meta.ts
import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
  id: "billing.invoices",
  title: "Invoice List",
  route: "/billing/invoices",
  owner: ["billing-team"],
  next: ["billing.invoice.detail", "billing.payments"],
  dependsOn: ["BillingAPI.listInvoices"],
})
```

---

## Features

### Screen Catalog

<img src="assets/screenshots/screens.png" alt="Screen Catalog" width="700">

Browse all screens in your application. Search by name and filter by tags.

### Navigation Graph

<img src="assets/screenshots/graph.png" alt="Navigation Graph" width="700">

Visualize how users flow through your app. See the big picture at a glance.

### Impact Analysis

<img src="assets/screenshots/impact.png" alt="Impact Analysis" width="700">

Changing an API? Know exactly which screens break — before you ship.

### Coverage Report

<img src="assets/screenshots/coverage.png" alt="Coverage Report" width="700">

Track documentation completeness. Find gaps. Enforce coverage in CI.

---

## Quick Start

```bash
# Install
pnpm add -D @screenbook/core @screenbook/cli

# Initialize
npx screenbook init

# Start the UI
npx screenbook dev
```

Open http://localhost:4321 to see your screen catalog.

## Defining Screens

Create `screen.meta.ts` files alongside your routes:

```ts
import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
  id: "billing.invoices",
  title: "Invoice List",
  route: "/billing/invoices",
  owner: ["billing-team"],
  tags: ["billing", "invoices"],

  // Where can users go from here?
  next: ["billing.invoice.detail", "billing.payments"],

  // What APIs does this screen depend on?
  dependsOn: ["BillingAPI.listInvoices", "UserAPI.getCurrent"],
})
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `screenbook init` | Initialize Screenbook in your project |
| `screenbook build` | Generate metadata JSON |
| `screenbook dev` | Start the UI server |
| `screenbook lint` | Check for missing screen definitions |

## CI Integration

Prevent documentation drift:

```yaml
# .github/workflows/screenbook.yml
- run: pnpm screenbook lint
```

## License

MIT
