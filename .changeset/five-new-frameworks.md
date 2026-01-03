---
"@screenbook/cli": minor
---

Add support for 5 new frameworks

### Config-based routing
- **Solid Router**: Support for `@solidjs/router` with nested routes and dynamic segments
- **Angular Router**: Support for Angular's `Routes` configuration with lazy loading

### File-based routing
- **SolidStart**: Auto-detect projects with `@solidjs/start` package and `src/routes/` directory
- **QwikCity**: Auto-detect projects with `@builder.io/qwik-city` package and `src/routes/` directory
- **TanStack Start**: Auto-detect projects with `@tanstack/react-start` package and `src/routes/__root.tsx`

### Bug fixes
- Fix CLI version display (was showing hardcoded 0.0.1, now reads from package.json)
