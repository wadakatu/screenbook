# Tech Stack

| Item | Choice |
|------|--------|
| Monorepo | pnpm workspaces |
| Build | tsdown |
| Test | Vitest |
| Linter/Formatter | Biome |
| UI | Astro (with React islands for interactive parts) |
| License | MIT |
| Documentation | English only |

## Reasoning

- **pnpm workspaces**: Simple, lightweight, mainstream in modern OSS
- **tsdown**: Successor to tsup, Rolldown-based, actively maintained
- **Vitest**: Vite-based, fast, TypeScript native support
- **Biome**: Replaces ESLint + Prettier, fast (Rust-based), simple config
- **Astro**: Framework-agnostic, lightweight output, perfect for catalog/docs
