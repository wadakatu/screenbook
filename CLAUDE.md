# Screenbook

Screen catalog and navigation graph generator for frontend applications.

## Quick Reference

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm test             # Run tests
pnpm lint             # Check linting (Biome)
pnpm lint:fix         # Auto-fix lint issues
pnpm typecheck        # Run TypeScript type checking
pnpm docs:dev         # Start docs dev server
```

## Project Structure

- `packages/core/` - `@screenbook/core` - Type definitions, `defineScreen()`, validation
- `packages/cli/` - `@screenbook/cli` - CLI commands (init, build, dev, lint, impact, generate, pr-impact)
- `packages/ui/` - `@screenbook/ui` - Astro-based UI with React islands
- `packages/screenbook/` - Main `screenbook` package (re-exports core + cli)
- `docs/` - Documentation site (Starlight/Astro)

## Tech Stack

| Tool | Purpose |
|------|---------|
| pnpm workspaces | Monorepo management |
| tsdown | Build (Rolldown-based) |
| Vitest | Testing |
| Biome | Linting & formatting |
| Astro | UI framework |
| TypeScript | Language (strict mode) |

## Key Commands

- `screenbook init` - Initialize project configuration
- `screenbook build` - Generate screens.json from screen.meta.ts files
- `screenbook dev` - Start UI server
- `screenbook lint` - Check for missing screen definitions (CI)
- `screenbook generate` - Auto-generate screen.meta.ts files
- `screenbook impact` - Analyze screen dependencies
- `screenbook pr-impact` - PR-focused impact analysis

## Conventions

- Commit messages: Conventional commits (feat:, fix:, docs:, etc.)
- Tests: Place in `__tests__/` or `*.test.ts` files
- Language: English only (code, docs, commits)

## Rules

Detailed rules are auto-loaded from `.claude/rules/`.
