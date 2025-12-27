# Implementation Priority (MVP Shortest Path)

## Order

1. **core**: `defineScreen()` and type definitions
2. **cli**: `build` command (aggregate meta info to JSON)
3. **cli**: `dev` command (start UI server)
4. **ui**: Screen list + Mermaid navigation graph
5. **cli**: `lint` command (for CI)
6. **cli**: `init` command

## Phase 0 + UI Deliverables

### @screenbook/core
- [ ] `defineScreen()` function
- [ ] TypeScript types for screen meta
- [ ] Zod schema for validation

### @screenbook/cli
- [ ] `screenbook build` - Generate screens.json from screen.meta.ts files
- [ ] `screenbook dev` - Start Astro dev server with UI
- [ ] `screenbook lint` - Check for missing screen.meta files
- [ ] `screenbook init` - Scaffold initial config

### @screenbook/ui
- [ ] Screen list page with search/filter
- [ ] Screen detail page
- [ ] Mermaid navigation graph
