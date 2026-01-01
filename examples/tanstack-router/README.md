# TanStack Router Example

This example demonstrates how to use Screenbook with TanStack Router.

## Setup

```bash
pnpm install
```

## Development

```bash
# Start the React development server
pnpm dev

# Run Screenbook commands
pnpm screenbook:build   # Build screen catalog
pnpm screenbook:dev     # Start Screenbook UI
pnpm screenbook:lint    # Check for missing screen.meta files
pnpm screenbook:generate # Generate screen.meta files from routes
```

## Project Structure

```
src/
├── layouts/
│   └── RootLayout.tsx      # Root layout with navigation
├── pages/
│   ├── Home/
│   │   ├── index.tsx
│   │   └── screen.meta.ts
│   ├── Dashboard/
│   │   ├── index.tsx
│   │   └── screen.meta.ts
│   ├── Settings/
│   │   ├── index.tsx
│   │   └── screen.meta.ts
│   └── User/
│       ├── index.tsx
│       ├── screen.meta.ts
│       └── Profile/
│           ├── index.tsx
│           └── screen.meta.ts
└── router/
    └── routes.tsx          # TanStack Router configuration
```

## Screenbook Configuration

The `screenbook.config.ts` file configures Screenbook for this project:

```ts
import { defineConfig } from "@screenbook/core"

export default defineConfig({
  routesFile: "src/router/routes.tsx",
  metaPattern: "src/**/screen.meta.ts",
})
```

## Route Configuration

This example uses `createRoute` and `createRootRoute` from TanStack Router:

```tsx
import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router"

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: Dashboard,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  // ...
])

export const router = createRouter({ routeTree })
```

Screenbook automatically detects TanStack Router configuration and parses routes from this file.

## TanStack Router Features

- **Type-safe routing**: TanStack Router provides fully type-safe route definitions
- **Code-based routing**: Routes are defined in code using `createRoute()` and `createRootRoute()`
- **Dynamic parameters**: Uses `$param` syntax (e.g., `/users/$userId`) which Screenbook normalizes to `:param`
- **Nested routes**: Built using `.addChildren([...])` method chaining
