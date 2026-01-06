# Next.js App Router + Screenbook Example

This example demonstrates how to integrate Screenbook with a Next.js application using the App Router.

## Project Structure

```
src/app/
├── layout.tsx
├── page.tsx              # Home route (/)
├── screen.meta.ts        # Home screen metadata
├── dashboard/
│   ├── page.tsx          # Dashboard route (/dashboard)
│   └── screen.meta.ts    # Dashboard screen metadata
└── settings/
    ├── page.tsx          # Settings route (/settings)
    └── screen.meta.ts    # Settings screen metadata
```

## Screenbook Configuration

The `screenbook.config.ts` file configures Screenbook for Next.js App Router:

```typescript
import { defineConfig } from "screenbook"

export default defineConfig({
  metaPattern: "src/app/**/screen.meta.ts",
  routesPattern: "src/app/**/page.tsx",
})
```

- `metaPattern`: Matches all `screen.meta.ts` files in the `src/app` directory
- `routesPattern`: Matches all `page.tsx` files (Next.js App Router convention)

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Build Screenbook metadata:

```bash
pnpm screenbook:build
```

3. Start the Screenbook dev server:

```bash
pnpm screenbook:dev
```

4. Check for missing screen metadata:

```bash
pnpm screenbook:lint
```

## Screen Metadata Example

Each screen has a colocated `screen.meta.ts` file:

```typescript
import { defineScreen } from "screenbook"

export const screen = defineScreen({
  id: "dashboard",
  title: "Dashboard",
  route: "/dashboard",
  owner: ["platform"],
  tags: ["analytics", "dashboard"],
  description: "Main dashboard showing analytics and metrics",
  entryPoints: ["home"],
  next: ["settings"],
  dependsOn: ["AnalyticsAPI.getStats", "AnalyticsAPI.getRevenue"],
})
```

## Navigation Graph

This example includes the following navigation flow:

```
Home → Dashboard → Settings
  ↘       ↗
   Settings
```

## Running the Next.js App

```bash
# Development
pnpm dev

# Production build
pnpm build
pnpm start
```
