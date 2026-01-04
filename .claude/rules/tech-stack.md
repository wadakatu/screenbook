# Tech Stack

| Item | Choice |
|------|--------|
| Runtime | Node.js 22+ |
| Package Manager | pnpm 10+ |
| Monorepo | pnpm workspaces |
| Build | tsdown (Rolldown-based) |
| Test | Vitest |
| Linter/Formatter | Biome |
| UI | Astro + React islands |
| Docs | Starlight (Astro) |
| License | MIT |

## Reasoning

- **pnpm workspaces**: Simple, lightweight, mainstream in modern OSS
- **tsdown**: Successor to tsup, Rolldown-based, actively maintained
- **Vitest**: Vite-based, fast, TypeScript native support
- **Biome**: Replaces ESLint + Prettier, fast (Rust-based), simple config
- **Astro**: Framework-agnostic, lightweight output, perfect for catalog/docs
- **Starlight**: Astro-based docs framework, great DX
