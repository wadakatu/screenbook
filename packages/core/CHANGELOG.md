# @screenbook/core

## 1.8.0

### Minor Changes

- 42dcedb: ### @screenbook/core
  - Add `GenerateConfig` type for smart screen ID generation options

  ### @screenbook/cli
  - Add `excludePatterns` support to lint command for excluding specific routes
  - Add smart screen ID generation from route paths in generate command
    - Converts route paths like `/billing/invoices/:id` to `billing.invoice.detail`
  - Improve spread operator warnings with structured `ParseWarning` type
  - Add `warnWithHelp` logger and `displayWarnings` helper for detailed warning output
  - Suppress orphan warnings on initial screen.meta.ts generation
  - Improve error handling and validation for screens.json

## 1.6.0

### Minor Changes

- ## New Features

  ### OpenAPI/Swagger Integration for dependsOn Validation

  Validate `dependsOn` references against OpenAPI/Swagger specifications to catch typos and non-existent API references.

  ```typescript
  // screenbook.config.ts
  export default defineConfig({
    apiIntegration: {
      openapi: {
        sources: ["./openapi.yaml"],
      },
    },
  });
  ```

  Supports both operationId and HTTP format:

  ```typescript
  dependsOn: [
    "getInvoiceById", // operationId format
    "GET /api/users/{id}", // HTTP format
  ];
  ```

  ### Badge Command

  New `screenbook badge` command to generate coverage badges for your README.

  ### Link Type Icons

  Added `type` field to `ScreenLink` for displaying icons in the navigation graph.

  ### Improved Error Messages

  Enhanced error messages with verbose mode and suggestions for common mistakes.

  ## Bug Fixes
  - Fixed CLI bundling issue with `@vue/compiler-sfc` packages causing startup failures

## 1.4.0

### Patch Changes

- 3d94ac4: ### @screenbook/cli

  #### New Features
  - Streamlined `init` command with automatic prompts for generate and dev server
  - New flags: `--generate`, `--no-generate`, `--dev`, `--no-dev`, `--yes/-y`, `--ci`

  #### Fixes
  - Add negatable option support for `--generate` and `--dev` flags

  #### Improvements
  - Update package metadata for better npm discoverability

  ### @screenbook/core

  #### Improvements
  - Update package metadata for better npm discoverability

## 1.2.0

### Minor Changes

- 331d5a5: Add config-based routing support for Vue Router, React Router, and TanStack Router

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

## 1.1.2

### Patch Changes

- e098a27: Update README with absolute image URLs and npm/pnpm install commands

## 1.1.1

### Patch Changes

- [#53](https://github.com/wadakatu/screenbook/pull/53) [`ff5a1ca`](https://github.com/wadakatu/screenbook/commit/ff5a1cada3937557416dc8ff5c5d6f2eacf1e3b3) Thanks [@wadakatu](https://github.com/wadakatu)! - Add README.md to all packages for npm display

## 1.0.0

### Major Changes

- # Screenbook v1.0.0

  First stable release of Screenbook - Screen catalog and navigation graph generator for frontend applications.

  ## @screenbook/core
  - `defineScreen()` function for declaring screen metadata
  - `defineConfig()` function for configuration
  - TypeScript types and Zod validation

  ## @screenbook/cli
  - `screenbook init` - Initialize Screenbook in a project with framework detection
  - `screenbook generate` - Auto-generate screen.meta.ts files from routes
  - `screenbook build` - Build screen metadata JSON with validation
  - `screenbook dev` - Start the development server
  - `screenbook lint` - Detect routes without screen.meta (CI-ready)
  - `screenbook impact` - Analyze API dependency impact
  - `screenbook pr-impact` - Analyze PR changes impact on screens
  - `screenbook doctor` - Diagnose common setup issues

  ### CLI Features
  - Circular navigation detection with allowCycles option
  - Screen reference validation
  - Progressive adoption mode
  - Interactive mode for generate command
  - Colored output with actionable error messages

  ## @screenbook/ui
  - Screen catalog with search and filtering
  - Screen detail view with metadata
  - Navigation graph visualization (Mermaid)
  - Impact analysis view
  - Coverage report
  - Responsive design with accessibility improvements

## 0.1.0

### Minor Changes

- [`0067b16`](https://github.com/wadakatu/screenbook/commit/0067b16006cdf9d0a52e89558b42d33a5a4b0679) - Initial release of Screenbook - screen catalog and navigation graph generator for frontend applications.

  Features:
  - `defineScreen()` for type-safe screen metadata definitions
  - `screenbook build` to generate screens.json
  - `screenbook dev` to start the UI server
  - `screenbook lint` to detect missing screen.meta files
  - `screenbook init` to scaffold initial configuration
  - `screenbook generate` to generate screen.meta.ts files
  - `screenbook pr-impact` for PR impact analysis
  - Screen list with search and filtering
  - Navigation graph visualization with Mermaid
