---
"@screenbook/cli": minor
"@screenbook/core": minor
---

Add config-based routing support for Vue Router, React Router, and TanStack Router

### New Features

**Config-based routing support (`routesFile` option)**
- Add `routesFile` config option for config-based routing frameworks
- Auto-detect router type (Vue Router, React Router, TanStack Router)

**Vue Router support**
- Parse route arrays with `path`, `component`, `name`, `children`
- Support lazy loading via `() => import('./Component')`
- Handle nested routes and dynamic segments

**React Router support**
- Parse `createBrowserRouter()` and JSX `<Route>` patterns
- Support `lazy` property for code splitting
- Handle `index` routes and catch-all routes

**TanStack Router support**
- Parse `createRootRoute()` and `createRoute()` patterns
- Build route tree from `.addChildren([...])`
- Path normalization (`$param` → `:param`, `$` → `*`)
- Lazy loading support via `lazyRouteComponent()` and `.lazy()`

### Documentation
- Add Framework Support page to documentation site
- Add example projects for Vue Router, React Router, and TanStack Router
