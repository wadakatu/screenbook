# @screenbook/cli

## 1.6.0

### Minor Changes

- ### New Features

  #### OpenAPI/Swagger Integration for dependsOn Validation

  Added support for validating `dependsOn` references against OpenAPI/Swagger specifications. This helps catch typos and invalid API references early in the development process.

  **Configuration:**

  ```ts
  // screenbook.config.ts
  export default defineConfig({
    apiIntegration: {
      openapi: {
        sources: ["./openapi.yaml", "https://api.example.com/openapi.json"],
      },
    },
  });
  ```

  **Features:**
  - Support for both operationId (`getInvoiceById`) and HTTP format (`GET /api/invoices/{id}`)
  - Support for OpenAPI 2.0 (Swagger), 3.0, and 3.1 specifications
  - Local files (YAML/JSON) and remote URLs
  - Fuzzy matching suggestions for typos
  - Warnings by default, errors with `--strict` flag

  #### Badge Command

  New `screenbook badge` command to generate coverage badges for your README.

  ```bash
  screenbook badge --output coverage-badge.svg
  ```

  #### Link Type Icons

  Added `type` field to `ScreenLink` for displaying different icons based on link type (navigation, action, docs, external).

  ```ts
  defineScreen({
    next: [
      { screen: "billing.payment", type: "action" },
      { screen: "billing.help", type: "docs" },
    ],
  });
  ```

  ### Improvements
  - **Verbose Mode**: Improved error messages with `--verbose` flag showing detailed stack traces
  - **Better Suggestions**: Enhanced typo detection with fuzzy matching for screen IDs and API references

### Patch Changes

- Updated dependencies
  - @screenbook/core@1.6.0

## 1.5.0

### Minor Changes

- Add comprehensive navigation detection for multiple frontend frameworks

  New features:
  - **Angular template detection**: Detect `routerLink` directives in Angular component templates (both inline and external templateUrl)
  - **Vue SFC template detection**: Detect `<RouterLink>` components in Vue Single File Components
  - **TanStack Router support**: Detect `<Link>` components and `navigate()` calls
  - **Solid Router support**: Detect `<A>` components and `navigate()` calls
  - **Angular Router support**: Detect `router.navigate()` and `router.navigateByUrl()` calls
  - **Vue Router support**: Detect `router.push()`, `router.replace()`, and object-based navigation
  - **`--detect-navigation` flag**: Auto-detect navigation targets in components during `screenbook generate`
  - **`--detect-api` flag**: Auto-detect API dependencies from imports during `screenbook generate`

  Improvements:
  - Extract common `ComponentAnalysisResult` type for framework analyzers
  - Improved error handling with actionable warning messages
  - Comprehensive test coverage for all detection patterns

## 1.4.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [3d94ac4]
  - @screenbook/core@1.4.0

## 1.3.0

### Minor Changes

- 9e728b2: Add support for 5 new frameworks

  ### Config-based routing
  - **Solid Router**: Support for `@solidjs/router` with nested routes and dynamic segments
  - **Angular Router**: Support for Angular's `Routes` configuration with lazy loading

  ### File-based routing
  - **SolidStart**: Auto-detect projects with `@solidjs/start` package and `src/routes/` directory
  - **QwikCity**: Auto-detect projects with `@builder.io/qwik-city` package and `src/routes/` directory
  - **TanStack Start**: Auto-detect projects with `@tanstack/react-start` package and `src/routes/__root.tsx`

  ### Bug fixes
  - Fix CLI version display (was showing hardcoded 0.0.1, now reads from package.json)

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

### Patch Changes

- Updated dependencies [331d5a5]
  - @screenbook/core@1.2.0

## 1.1.3

### Patch Changes

- fix(cli): recognize unified screenbook package in doctor command

  The doctor command now correctly detects the unified `screenbook` package in addition to `@screenbook/core` and `@screenbook/cli`.

## 1.1.2

### Patch Changes

- e098a27: Update README with absolute image URLs and npm/pnpm install commands
- Updated dependencies [e098a27]
  - @screenbook/core@1.1.2

## 1.1.1

### Patch Changes

- [#53](https://github.com/wadakatu/screenbook/pull/53) [`ff5a1ca`](https://github.com/wadakatu/screenbook/commit/ff5a1cada3937557416dc8ff5c5d6f2eacf1e3b3) Thanks [@wadakatu](https://github.com/wadakatu)! - Add README.md to all packages for npm display

- Updated dependencies [[`ff5a1ca`](https://github.com/wadakatu/screenbook/commit/ff5a1cada3937557416dc8ff5c5d6f2eacf1e3b3)]:
  - @screenbook/core@1.1.1

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

### Patch Changes

- Updated dependencies []:
  - @screenbook/core@1.0.0

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

### Patch Changes

- Updated dependencies [[`0067b16`](https://github.com/wadakatu/screenbook/commit/0067b16006cdf9d0a52e89558b42d33a5a4b0679)]:
  - @screenbook/core@0.1.0
