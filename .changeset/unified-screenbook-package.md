---
"screenbook": minor
"@screenbook/ui": patch
---

feat: add unified screenbook package for simplified installation

- New `screenbook` umbrella package that includes core, cli, and ui
- Simplified installation: `pnpm add -D screenbook`
- Unified imports: `import { defineScreen } from "screenbook"`
- Mock Editor redesign with 3-column tabbed panels layout
- Improved accessibility (Lighthouse 100%)
