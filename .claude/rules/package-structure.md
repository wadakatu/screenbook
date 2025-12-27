# Package Structure

```
screenbook/
├── packages/
│   ├── core/                 # @screenbook/core
│   │   ├── src/
│   │   │   ├── defineScreen.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── tsdown.config.ts
│   │   └── package.json
│   │
│   ├── cli/                  # @screenbook/cli
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── init.ts
│   │   │   │   ├── build.ts
│   │   │   │   ├── dev.ts
│   │   │   │   └── lint.ts
│   │   │   └── index.ts
│   │   ├── tsdown.config.ts
│   │   └── package.json
│   │
│   └── ui/                   # @screenbook/ui
│       ├── src/
│       │   ├── pages/
│       │   │   ├── index.astro      # Screen list
│       │   │   └── [id].astro       # Screen detail
│       │   ├── components/
│       │   │   ├── ScreenList.tsx   # React island
│       │   │   ├── GraphView.tsx    # Mermaid display
│       │   │   └── SearchFilter.tsx
│       │   └── layouts/
│       ├── astro.config.mjs
│       └── package.json
│
├── pnpm-workspace.yaml
├── package.json
├── biome.json
├── vitest.config.ts
├── tsconfig.json
├── LICENSE
└── README.md
```

## Package Responsibilities

| Package | Role | Dependencies |
|---------|------|--------------|
| `@screenbook/core` | `defineScreen()`, type definitions, validation | zod |
| `@screenbook/cli` | init/build/dev/lint commands | core, commander, glob |
| `@screenbook/ui` | Screen list/detail/navigation graph display | core, astro, mermaid |
