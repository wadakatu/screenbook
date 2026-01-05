# @screenbook/ui

## 1.6.1

### Patch Changes

- ef23c0f: fix: resolve workspace:\* protocol in published packages

  Previously, packages were published with `workspace:*` protocol instead of actual version numbers, causing installation failures in pnpm workspaces. This release fixes the issue by using `pnpm publish` which automatically converts workspace protocols.

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
  })
  ```

  Supports both operationId and HTTP format:

  ```typescript
  dependsOn: [
  	"getInvoiceById", // operationId format
  	"GET /api/users/{id}", // HTTP format
  ]
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

## 1.4.0

### Patch Changes

- Updated dependencies [3d94ac4]
  - @screenbook/core@1.4.0

## 1.2.0

### Patch Changes

- Updated dependencies [331d5a5]
  - @screenbook/core@1.2.0

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

## 1.1.0

### Patch Changes

- [#48](https://github.com/wadakatu/screenbook/pull/48) [`f046e2b`](https://github.com/wadakatu/screenbook/commit/f046e2bfac29cf3a81417430f0bbb3077be57874) Thanks [@wadakatu](https://github.com/wadakatu)! - feat: add unified screenbook package for simplified installation
  - New `screenbook` umbrella package that includes core, cli, and ui
  - Simplified installation: `pnpm add -D screenbook`
  - Unified imports: `import { defineScreen } from "screenbook"`
  - Mock Editor redesign with 3-column tabbed panels layout
  - Improved accessibility (Lighthouse 100%)

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
