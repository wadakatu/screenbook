# Quality Standards

## Pre-commit Checklist

1. `pnpm lint` - No linting errors
2. `pnpm test` - All tests pass
3. `pnpm typecheck` - No type errors
4. `pnpm build` - Build succeeds

## Example Verification (Required)

**All bug fixes and new features MUST be verified using example projects.**

Before creating a PR:

1. **Identify relevant example** - Find the appropriate example in `examples/` directory
2. **Add test case** - If the feature/fix isn't covered, add it to the example
3. **Run verification** - Execute the relevant screenbook command (e.g., `pnpm screenbook generate --dry-run`)
4. **Confirm expected behavior** - Verify the output matches expectations
5. **Keep example changes** - Commit example changes as part of the PR (serves as integration test)

### Example Projects

| Example | Router Type | Use For |
|---------|-------------|---------|
| `angular-router` | Angular Router | Angular-specific features |
| `react-router` | React Router | React Router features |
| `vue-router` | Vue Router | Vue Router features |
| `solid-router` | Solid Router | Solid Router features |
| `tanstack-router` | TanStack Router | TanStack Router features |
| `nextjs-app-router` | Next.js App Router | Next.js features |

### Why This Matters

- Unit tests alone don't catch integration issues
- Examples serve as living documentation
- Provides confidence that features work end-to-end
- Makes it easier for users to understand new features

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
