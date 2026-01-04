# Screenbook Overview

Screenbook is an OSS tool that generates screen catalogs, navigation graphs, and impact analysis from code-based screen definitions.

**Concept**: "Declare screens in code, auto-generate screen catalog, navigation graph, and impact analysis"

## Core Features

- `defineScreen()` with typed meta definitions
- Screen list (search / tag / owner filter)
- Screen detail (route, owner, tags, dependsOn, entryPoints, next)
- Navigation graph display (Mermaid)
- Impact analysis for API/screen dependencies
- CI integration with `screenbook lint`

## Screen Meta Definition Format

```ts
import { defineScreen } from "screenbook"

export const screen = defineScreen({
  id: "billing.invoice.detail",
  title: "Invoice Detail",
  route: "/billing/invoices/:id",
  owner: ["billing"],
  tags: ["billing", "invoice"],
  dependsOn: ["InvoiceAPI.getDetail", "PaymentAPI.getStatus"],
  entryPoints: ["billing.invoice.list"],
  next: ["billing.invoice.edit", "billing.payment.start"],
})
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `screenbook init` | Initialize screenbook in a project |
| `screenbook build` | Aggregate meta info and generate JSON |
| `screenbook dev` | Start UI server for local development |
| `screenbook lint` | Detect routes without screen.meta (for CI) |
| `screenbook generate` | Auto-generate screen.meta.ts from routes |
| `screenbook impact` | Analyze screen/API dependencies |
| `screenbook pr-impact` | PR-focused impact analysis |
