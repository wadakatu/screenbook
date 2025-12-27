# Screenbook

> Screen catalog and navigation graph generator for frontend applications

Screenbook generates screen catalogs and navigation graphs from code-based screen definitions. Keep your screen documentation always up-to-date by making code the source of truth.

## Features

- **Screen Catalog**: Auto-generate a searchable list of all screens
- **Navigation Graph**: Visualize screen transitions with Mermaid diagrams
- **Auto-scaffolding**: Generate `screen.meta.ts` files from your existing routes
- **CI Integration**: Fail builds when screen metadata is missing

## Installation

```bash
npm install -D @screenbook/core @screenbook/cli
# or
pnpm add -D @screenbook/core @screenbook/cli
```

## Quick Start

1. Initialize Screenbook in your project:

```bash
npx screenbook init
```

2. Configure your routes pattern in `screenbook.config.ts`:

```ts
import { defineConfig } from "@screenbook/core"

export default defineConfig({
  metaPattern: "src/pages/**/screen.meta.ts",
  routesPattern: "src/pages/**/page.tsx",  // Adjust for your framework
})
```

3. Auto-generate screen metadata from your routes:

```bash
npx screenbook generate
```

This creates `screen.meta.ts` files alongside your route files:

```
src/pages/billing/invoices/
├── page.tsx           # Your existing route file
└── screen.meta.ts     # Auto-generated, customize as needed
```

4. Customize the generated metadata:

```ts
// src/pages/billing/invoices/screen.meta.ts
import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
  id: "billing.invoices",
  title: "Invoices",
  route: "/billing/invoices",
  owner: ["billing-team"],
  tags: ["billing"],
  next: ["billing.payments"],
})
```

5. Start the development server:

```bash
npx screenbook dev
```

6. Open http://localhost:4321 to view your screen catalog.

## CLI Commands

| Command | Description |
|---------|-------------|
| `screenbook init` | Initialize Screenbook in your project |
| `screenbook generate` | Auto-generate screen.meta.ts from routes |
| `screenbook build` | Generate screen metadata JSON |
| `screenbook dev` | Start the UI development server |
| `screenbook lint` | Check for missing screen.meta files |

## Configuration

Create a `screenbook.config.ts` in your project root:

```ts
import { defineConfig } from "@screenbook/core"

export default defineConfig({
  // Pattern to find screen.meta.ts files
  metaPattern: "src/**/screen.meta.ts",

  // Pattern to find route files (for generate/lint commands)
  // Uncomment the pattern that matches your framework:
  // routesPattern: "src/pages/**/page.tsx",   // Vite/React
  // routesPattern: "app/**/page.tsx",         // Next.js App Router
  // routesPattern: "src/pages/**/*.vue",      // Vue/Nuxt

  // Output directory for generated files
  outDir: ".screenbook",
})
```

## License

MIT
