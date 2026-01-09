---
"@screenbook/core": minor
"@screenbook/cli": minor
---

### @screenbook/core

- Add `GenerateConfig` type for smart screen ID generation options

### @screenbook/cli

- Add `excludePatterns` support to lint command for excluding specific routes
- Add smart screen ID generation from route paths in generate command
  - Converts route paths like `/billing/invoices/:id` to `billing.invoice.detail`
- Improve spread operator warnings with structured `ParseWarning` type
- Add `warnWithHelp` logger and `displayWarnings` helper for detailed warning output
- Suppress orphan warnings on initial screen.meta.ts generation
- Improve error handling and validation for screens.json
