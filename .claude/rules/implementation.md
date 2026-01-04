# Implementation Guidelines

## Package Architecture

| Package | Role | Key Exports |
|---------|------|-------------|
| `@screenbook/core` | Type definitions, validation | `defineScreen()`, `defineConfig()`, types |
| `@screenbook/cli` | CLI commands | All CLI functionality |
| `@screenbook/ui` | Astro-based UI | Screen catalog, graph, impact views |
| `screenbook` | Main package | Re-exports core + cli |

## Adding New Features

1. **Core changes**: Update types in `packages/core/src/types.ts`
2. **CLI commands**: Add to `packages/cli/src/commands/`
3. **UI pages**: Add to `packages/ui/src/pages/`

## CLI Command Structure

Commands are built with Commander.js. Each command has:
- Command definition in `packages/cli/src/commands/`
- Tests in `packages/cli/src/__tests__/`
- Docs in `docs/src/content/docs/cli/`

## Testing Strategy

- Unit tests for core logic
- Integration tests for CLI commands
- Test files: `*.test.ts` or in `__tests__/` directories
