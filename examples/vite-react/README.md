# Vite + React + Screenbook Example

This example demonstrates how to integrate Screenbook with a Vite + React application using React Router.

## Project Structure

```
src/
├── main.tsx              # React entry point with BrowserRouter
├── App.tsx               # Route definitions
└── pages/
    ├── Home/
    │   ├── index.tsx     # Home page component
    │   └── screen.meta.ts
    ├── Dashboard/
    │   ├── index.tsx     # Dashboard page component
    │   └── screen.meta.ts
    └── Settings/
        ├── index.tsx     # Settings page component
        └── screen.meta.ts
```

## Screenbook Configuration

The `screenbook.config.ts` file configures Screenbook for Vite + React:

```typescript
import { defineConfig } from "screenbook"

export default defineConfig({
  metaPattern: "src/pages/**/screen.meta.ts",
  routesPattern: "src/pages/**/index.tsx",
})
```

- `metaPattern`: Matches all `screen.meta.ts` files in the `src/pages` directory
- `routesPattern`: Matches all `index.tsx` files (page components)

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

## Routing Setup

This example uses React Router for client-side routing. The routes are defined in `App.tsx`:

```tsx
import { Route, Routes } from "react-router-dom"
import Home from "./pages/Home"
import Dashboard from "./pages/Dashboard"
import Settings from "./pages/Settings"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  )
}
```

## Navigation Graph

This example includes the following navigation flow:

```
Home → Dashboard → Settings
  ↘       ↗
   Settings
```

## Running the Vite App

```bash
# Development
pnpm dev

# Production build
pnpm build
pnpm preview
```
