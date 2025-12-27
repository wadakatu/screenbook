---
paths: packages/**/*.{ts,tsx,js,jsx}
---

# Development Guidelines

## Code Style

- Use Biome for linting and formatting
- Run `pnpm biome check --write` before committing
- TypeScript strict mode enabled

## Testing

- Use Vitest for all tests
- Place tests in `__tests__` directories or `*.test.ts` files
- Run `pnpm test` before committing

## Building

- Use tsdown for building packages
- Support both CJS and ESM outputs
- Generate type declarations

## Commits

- Write commit messages in English
- Use conventional commit format (feat:, fix:, docs:, etc.)

## Design Principles

- **Framework agnostic**: Core and CLI should work with any frontend framework
- **5-minute setup**: Installation and first run should take less than 5 minutes
- **CI-first**: Prevent documentation drift by failing CI when screen.meta is missing
- **Minimal configuration**: Sensible defaults, zero-config where possible
- **Code as source of truth**: Screen definitions live in code, not external docs
