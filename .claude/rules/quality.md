# Quality Standards

## Always Use Latest Versions

Before adding any dependency or configuration:

1. **Check latest version** - Search for the latest stable version of the library
2. **Check best practices** - Research current best practices for configuration files
3. **Verify compatibility** - Ensure compatibility with other dependencies

## Libraries to Keep Updated

| Library | Check Command |
|---------|---------------|
| TypeScript | `npm view typescript version` |
| Zod | `npm view zod version` |
| Biome | `npm view @biomejs/biome version` |
| Vitest | `npm view vitest version` |
| tsdown | `npm view tsdown version` |
| Astro | `npm view astro version` |

## Configuration Files

Always verify schema URLs and settings match the installed version:

- `tsconfig.json` - Check TypeScript best practices
- `biome.json` - Use matching schema version
- `package.json` - Use caret (^) for minor updates

## Before Implementation

When creating new packages or adding dependencies:

1. Search: `{library name} latest version {current year}`
2. Search: `{config file} best practices {current year}`
3. Verify breaking changes in migration guides
