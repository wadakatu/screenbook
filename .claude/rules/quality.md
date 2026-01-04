# Quality Standards

## Pre-commit Checklist

1. `pnpm lint` - No linting errors
2. `pnpm test` - All tests pass
3. `pnpm typecheck` - No type errors
4. `pnpm build` - Build succeeds

## Dependency Management

Before adding dependencies:

1. **Check latest version** - Use stable versions
2. **Check bundle size** - Prefer lightweight alternatives
3. **Verify compatibility** - Test with existing dependencies
4. Use caret (`^`) for version ranges in package.json

## Key Libraries

| Library | Purpose |
|---------|---------|
| zod | Schema validation |
| commander | CLI framework |
| jiti | Runtime TypeScript loading |
| glob | File pattern matching |
| mermaid | Graph visualization |

## Configuration Files

- `biome.json` - Linting and formatting rules
- `tsconfig.json` - TypeScript settings (strict mode)
- `tsdown.config.ts` - Build configuration per package

## Code Quality

- Write self-documenting code
- Add tests for new features and bug fixes
- Keep functions small and focused
- Handle errors gracefully with clear messages
