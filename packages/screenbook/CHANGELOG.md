# screenbook

## 1.8.0

### Patch Changes

- Updated dependencies [42dcedb]
  - @screenbook/core@1.8.0
  - @screenbook/cli@1.8.0
  - @screenbook/ui@1.8.0

## 1.7.2

### Patch Changes

- b44ee50: ### @screenbook/cli
  - Use `screenbook` imports in generated templates and config examples.

  ### screenbook
  - Align CLI output templates to reference `screenbook` instead of `@screenbook/core`.

- Updated dependencies [b44ee50]
  - @screenbook/cli@1.7.2

## 1.7.1

### Patch Changes

- 540caef: ### @screenbook/cli
  - Fix coverage calculation to use route files count instead of total routes
  - Fix missing routes identification in coverage.json
  - Exclude component directories from screen.meta.ts generation
  - Use Vue Router config for route extraction in routesPattern mode

  ### @screenbook/ui
  - Expand graph visualization to use available container space
  - Escape slashes in Mermaid graph labels

- Updated dependencies [540caef]
  - @screenbook/cli@1.7.1
  - @screenbook/ui@1.7.1

## 1.7.0

### Patch Changes

- Updated dependencies [80700ff]
- Updated dependencies [f2595d9]
  - @screenbook/ui@1.7.0
  - @screenbook/cli@1.7.0

## 1.6.1

### Patch Changes

- ef23c0f: fix: resolve workspace:\* protocol in published packages

  Previously, packages were published with `workspace:*` protocol instead of actual version numbers, causing installation failures in pnpm workspaces. This release fixes the issue by using `pnpm publish` which automatically converts workspace protocols.

- Updated dependencies [ef23c0f]
  - @screenbook/cli@1.6.1
  - @screenbook/ui@1.6.1

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

### Patch Changes

- Updated dependencies
  - @screenbook/core@1.6.0
  - @screenbook/cli@1.6.0
  - @screenbook/ui@1.6.0

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

### Patch Changes

- Updated dependencies
  - @screenbook/cli@1.5.0

## 1.4.0

### Patch Changes

- Updated dependencies [3d94ac4]
  - @screenbook/cli@1.4.0
  - @screenbook/core@1.4.0
  - @screenbook/ui@1.4.0

## 1.3.0

### Patch Changes

- Updated dependencies [9e728b2]
  - @screenbook/cli@1.3.0

## 1.2.0

### Patch Changes

- Updated dependencies [331d5a5]
  - @screenbook/cli@1.2.0
  - @screenbook/core@1.2.0
  - @screenbook/ui@1.2.0

## 1.1.3

### Patch Changes

- fix(cli): recognize unified screenbook package in doctor command

  The doctor command now correctly detects the unified `screenbook` package in addition to `@screenbook/core` and `@screenbook/cli`.

- Updated dependencies
  - @screenbook/cli@1.1.3

## 1.1.2

### Patch Changes

- e098a27: Update README with absolute image URLs and npm/pnpm install commands
- Updated dependencies [e098a27]
  - @screenbook/core@1.1.2
  - @screenbook/cli@1.1.2
  - @screenbook/ui@1.1.2

## 1.1.1

### Patch Changes

- [#53](https://github.com/wadakatu/screenbook/pull/53) [`ff5a1ca`](https://github.com/wadakatu/screenbook/commit/ff5a1cada3937557416dc8ff5c5d6f2eacf1e3b3) Thanks [@wadakatu](https://github.com/wadakatu)! - Add README.md to all packages for npm display

- Updated dependencies [[`ff5a1ca`](https://github.com/wadakatu/screenbook/commit/ff5a1cada3937557416dc8ff5c5d6f2eacf1e3b3)]:
  - @screenbook/core@1.1.1
  - @screenbook/cli@1.1.1
  - @screenbook/ui@1.1.1

## 1.1.0

### Minor Changes

- [#48](https://github.com/wadakatu/screenbook/pull/48) [`f046e2b`](https://github.com/wadakatu/screenbook/commit/f046e2bfac29cf3a81417430f0bbb3077be57874) Thanks [@wadakatu](https://github.com/wadakatu)! - feat: add unified screenbook package for simplified installation
  - New `screenbook` umbrella package that includes core, cli, and ui
  - Simplified installation: `pnpm add -D screenbook`
  - Unified imports: `import { defineScreen } from "screenbook"`
  - Mock Editor redesign with 3-column tabbed panels layout
  - Improved accessibility (Lighthouse 100%)

### Patch Changes

- Updated dependencies [[`f046e2b`](https://github.com/wadakatu/screenbook/commit/f046e2bfac29cf3a81417430f0bbb3077be57874)]:
  - @screenbook/ui@1.1.0
