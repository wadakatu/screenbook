# screenbook

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
