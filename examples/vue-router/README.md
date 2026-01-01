# Vue Router + Screenbook Example

This example demonstrates how to integrate Screenbook with a Vue 3 application using Vue Router with config-based routing.

## Project Structure

```
src/
├── router/
│   ├── index.ts          # Router creation
│   └── routes.ts         # Route definitions (used by Screenbook)
├── views/
│   ├── Home/
│   │   ├── index.vue         # Home route (/)
│   │   └── screen.meta.ts    # Home screen metadata
│   ├── Dashboard/
│   │   ├── index.vue         # Dashboard route (/dashboard)
│   │   └── screen.meta.ts    # Dashboard screen metadata
│   ├── Settings/
│   │   ├── index.vue         # Settings route (/settings)
│   │   └── screen.meta.ts    # Settings screen metadata
│   ├── User/
│   │   ├── index.vue         # User route (/user/:id)
│   │   └── screen.meta.ts    # User screen metadata
│   └── UserProfile/
│       ├── index.vue         # Profile route (/user/:id/profile)
│       └── screen.meta.ts    # Profile screen metadata
├── App.vue
└── main.ts
```

## Screenbook Configuration

The `screenbook.config.ts` file configures Screenbook for Vue Router's config-based routing:

```typescript
import { defineConfig } from "@screenbook/core"

export default defineConfig({
  routesFile: "src/router/routes.ts",
  metaPattern: "src/**/screen.meta.ts",
})
```

- `routesFile`: Points to the Vue Router routes configuration file (config-based routing)
- `metaPattern`: Matches all `screen.meta.ts` files

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Generate screen metadata from routes:

```bash
pnpm screenbook:generate
```

3. Build Screenbook metadata:

```bash
pnpm screenbook:build
```

4. Start the Screenbook dev server:

```bash
pnpm screenbook:dev
```

5. Check for missing screen metadata:

```bash
pnpm screenbook:lint
```

## Screen Metadata Example

Each screen has a colocated `screen.meta.ts` file:

```typescript
import { defineScreen } from "@screenbook/core"

export const screen = defineScreen({
  id: "user.id.profile",
  title: "Profile",
  route: "/user/:id/profile",
  owner: [],
  tags: ["user"],
  dependsOn: [],
  entryPoints: [],
  next: [],
})
```

## Vue Router Configuration

Routes are defined in `src/router/routes.ts`:

```typescript
import type { RouteRecordRaw } from "vue-router"

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: () => import("../views/Home/index.vue"),
  },
  {
    path: "/user/:id",
    name: "user",
    component: () => import("../views/User/index.vue"),
    children: [
      {
        path: "profile",
        name: "user-profile",
        component: () => import("../views/UserProfile/index.vue"),
      },
    ],
  },
]
```

## Running the Vue App

```bash
# Development
pnpm dev

# Production build
pnpm build
pnpm preview
```
