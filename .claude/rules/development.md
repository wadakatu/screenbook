---
paths: packages/**/*.{ts,tsx,js,jsx}
---

# Development Guidelines

## Code Style

- Use Biome for linting and formatting
- Run `pnpm lint:fix` before committing
- TypeScript strict mode enabled
- No unused imports or variables

## Testing

- Use Vitest for all tests
- Place tests in `__tests__/` directories or `*.test.ts` files
- Run `pnpm test` before committing
- Aim for high test coverage on core logic

## Building

- Use tsdown for building packages
- Support both CJS and ESM outputs
- Generate type declarations (.d.ts)

## Commits

- Write commit messages in English
- Use conventional commit format:
  - `feat(scope):` New features
  - `fix(scope):` Bug fixes
  - `docs:` Documentation
  - `refactor(scope):` Code refactoring
  - `test(scope):` Test changes
  - `chore:` Tooling/build changes

## Design Principles

- **Framework agnostic**: Core and CLI work with any frontend framework
- **5-minute setup**: Installation and first run < 5 minutes
- **CI-first**: Fail CI when screen.meta is missing
- **Minimal configuration**: Sensible defaults, zero-config where possible
- **Code as source of truth**: Screen definitions live in code, not external docs
