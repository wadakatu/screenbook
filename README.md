# Screenbook

> Screen catalog and navigation graph generator for frontend applications

Screenbook generates screen catalogs, navigation graphs, and impact analysis from code-based screen definitions. Keep your screen documentation always up-to-date by making code the source of truth.

## Features

- **Screen Catalog**: Auto-generate a searchable list of all screens
- **Navigation Graph**: Visualize screen transitions with Mermaid diagrams
- **Impact Analysis**: Understand which screens are affected by API or screen changes
- **CI Integration**: Fail builds when screen metadata is missing

## Installation

```bash
npm install -D screenbook
# or
pnpm add -D screenbook
# or
yarn add -D screenbook
```

## Quick Start

1. Initialize Screenbook in your project:

```bash
npx screenbook init
```

2. Add screen metadata to your screens:

```ts
// src/screens/billing/invoice/detail/screen.meta.ts
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

3. Start the development server:

```bash
npx screenbook dev
```

4. Open http://localhost:4321 to view your screen catalog.

## CLI Commands

| Command | Description |
|---------|-------------|
| `screenbook init` | Initialize Screenbook in your project |
| `screenbook dev` | Start the UI development server |
| `screenbook build` | Generate screen metadata JSON |
| `screenbook lint` | Check for missing screen.meta files |

## Configuration

Create a `screenbook.config.ts` in your project root:

```ts
import { defineConfig } from "screenbook"

export default defineConfig({
  // Directory containing your screens
  screensDir: "src/screens",
  // Output directory for generated files
  outDir: ".screenbook",
  // File pattern for screen metadata
  metaPattern: "**/screen.meta.ts",
})
```

## License

MIT
