---
"@screenbook/cli": patch
"@screenbook/ui": patch
"screenbook": patch
---

### @screenbook/cli

- Fix coverage calculation to use route files count instead of total routes
- Fix missing routes identification in coverage.json
- Exclude component directories from screen.meta.ts generation
- Use Vue Router config for route extraction in routesPattern mode

### @screenbook/ui

- Expand graph visualization to use available container space
- Escape slashes in Mermaid graph labels
