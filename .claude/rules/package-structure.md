# Package Structure

```
screenbook/
├── packages/
│   ├── core/                 # @screenbook/core
│   │   ├── src/
│   │   │   ├── config.ts         # defineConfig
│   │   │   ├── screen.ts         # defineScreen
│   │   │   ├── types.ts          # Type definitions
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── cli/                  # @screenbook/cli
│   │   ├── src/
│   │   │   ├── commands/         # CLI command implementations
│   │   │   ├── utils/            # Shared utilities
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── ui/                   # @screenbook/ui
│   │   ├── src/
│   │   │   ├── pages/            # Astro pages
│   │   │   ├── components/       # React islands
│   │   │   └── layouts/
│   │   └── package.json
│   │
│   └── screenbook/           # Main package (re-exports)
│       └── package.json
│
├── docs/                     # Documentation site (Starlight)
├── .github/                  # GitHub workflows
├── .changeset/               # Changeset configuration
├── biome.json
└── package.json
```

## Package Responsibilities

| Package | Role | Key Dependencies |
|---------|------|------------------|
| `@screenbook/core` | Type definitions, config, validation | zod |
| `@screenbook/cli` | CLI commands (init, build, dev, lint, etc.) | commander, glob, jiti |
| `@screenbook/ui` | Screen catalog UI, navigation graph | astro, react, mermaid |
| `screenbook` | User-facing package, re-exports core + cli | core, cli |
