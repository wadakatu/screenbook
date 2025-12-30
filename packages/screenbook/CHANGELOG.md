# screenbook

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
