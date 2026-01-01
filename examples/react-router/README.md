# React Router Example

This example demonstrates how to use Screenbook with React Router v7.

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
    └── routes.tsx          # React Router configuration
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

This example uses `createBrowserRouter` from React Router v7:

```tsx
import { createBrowserRouter } from "react-router-dom"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "dashboard", element: <Dashboard /> },
      // ...
    ],
  },
])
```

Screenbook automatically detects React Router configuration and parses routes from this file.
