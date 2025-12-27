<p align="center">
  <img src="assets/logo/icon.svg" alt="Screenbook" width="80" height="80">
</p>

<h1 align="center">Screenbook</h1>

<p align="center">
  <strong>Your team's screen map is out of date. Again.</strong>
</p>

<p align="center">
  <img src="assets/demo.gif" alt="Screenbook Demo" width="700">
</p>

## The Problem

Every team has a screen map somewhere. FigJam, Figma, Notion, a random spreadsheet...

**But when was it last updated?**

- New members can't trust it for onboarding
- Complex navigation flows have missing screens
- "Which screens are affected if I change this?" - nobody knows
- Manual updates are tedious, so nobody does them

## The Solution

**Define screens in code. Get an always-up-to-date catalog.**

```ts
// src/pages/billing/invoices/screen.meta.ts
export const screen = defineScreen({
  id: "billing.invoices",
  title: "Invoice List",
  route: "/billing/invoices",
  owner: ["billing-team"],
  next: ["billing.invoice.detail", "billing.payments"],
  dependsOn: ["BillingAPI.listInvoices"],
})
```

Screenbook automatically generates:

| Feature | What it solves |
|---------|----------------|
| **Screen List** | "What screens do we have?" |
| **Navigation Graph** | "How do users flow through the app?" |
| **Impact Analysis** | "If I change this, what breaks?" |
| **Coverage Report** | "Which screens are undocumented?" |

## Use Cases

### Onboarding New Members

> "Where can I see all the screens in our app?"

Point them to Screenbook. The catalog is always current because it's generated from code.

### Understanding Complex Flows

> "What happens after the user clicks 'Pay'?"

The navigation graph shows all possible paths. No more hunting through FigJam layers.

### Planning Changes

> "I need to update the Invoice API. What screens will be affected?"

Impact Analysis tells you instantly. Direct dependencies and transitive ones too.

### Keeping Documentation in Sync

> "Our screen map is 6 months old..."

When screens are defined in code, they can't drift. CI can enforce coverage.

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

  // Navigation: where can users go from here?
  next: ["billing.invoice.detail", "billing.payments"],

  // Dependencies: what APIs does this screen use?
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
| `screenbook impact <api>` | Analyze impact of API changes |

## CI Integration

Prevent documentation drift:

```yaml
# .github/workflows/screenbook.yml
- run: pnpm screenbook lint
```

## License

MIT
