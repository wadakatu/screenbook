---
editUrl: false
next: false
prev: false
title: "Config"
---

Defined in: [packages/core/src/types.ts:540](https://github.com/wadakatu/screenbook/blob/4ba6a4e3732f38bc073b7e86b10e48c6943abce4/packages/core/src/types.ts#L540)

Screenbook configuration options.

## Properties

### adoption?

> `optional` **adoption**: [`AdoptionConfig`](/screenbook/api/interfaces/adoptionconfig/)

Defined in: [packages/core/src/types.ts:595](https://github.com/wadakatu/screenbook/blob/4ba6a4e3732f38bc073b7e86b10e48c6943abce4/packages/core/src/types.ts#L595)

Progressive adoption configuration for gradual rollout

#### Example

```ts
{ mode: "progressive", includePatterns: ["src/pages/billing/**"], minimumCoverage: 80 }
```

***

### apiIntegration?

> `optional` **apiIntegration**: [`ApiIntegrationConfig`](/screenbook/api/interfaces/apiintegrationconfig/)

Defined in: [packages/core/src/types.ts:602](https://github.com/wadakatu/screenbook/blob/4ba6a4e3732f38bc073b7e86b10e48c6943abce4/packages/core/src/types.ts#L602)

API integration configuration for auto-detecting dependencies
from OpenAPI-generated clients (Orval, openapi-typescript, etc.)

#### Example

```ts
{ clientPackages: ["@/api/generated"] }
```

***

### excludePatterns?

> `optional` **excludePatterns**: `string`[]

Defined in: [packages/core/src/types.ts:589](https://github.com/wadakatu/screenbook/blob/4ba6a4e3732f38bc073b7e86b10e48c6943abce4/packages/core/src/types.ts#L589)

Patterns to exclude from route detection.
Directories matching these patterns are ignored when checking for screen.meta.ts.
Useful for excluding component directories like "components/", "hooks/", etc.

#### See

https://github.com/wadakatu/screenbook/issues/190

***

### ignore

> **ignore**: `string`[]

Defined in: [packages/core/src/types.ts:581](https://github.com/wadakatu/screenbook/blob/4ba6a4e3732f38bc073b7e86b10e48c6943abce4/packages/core/src/types.ts#L581)

Patterns to ignore when scanning (glob patterns).
Defaults to node_modules and .git directories.

***

### lint?

> `optional` **lint**: [`LintConfig`](/screenbook/api/interfaces/lintconfig/)

Defined in: [packages/core/src/types.ts:608](https://github.com/wadakatu/screenbook/blob/4ba6a4e3732f38bc073b7e86b10e48c6943abce4/packages/core/src/types.ts#L608)

Lint configuration for controlling warning behavior

#### Example

```ts
{ orphans: "off" }
```

***

### metaPattern

> **metaPattern**: `string`

Defined in: [packages/core/src/types.ts:556](https://github.com/wadakatu/screenbook/blob/4ba6a4e3732f38bc073b7e86b10e48c6943abce4/packages/core/src/types.ts#L556)

Glob pattern for screen metadata files.
Supports colocation: place screen.meta.ts alongside your route files.

#### Default

```ts
"src/**/screen.meta.ts"
```

#### Examples

```ts
"src/**/screen.meta.ts"
```

```ts
"app/**/screen.meta.ts"
```

***

### outDir

> **outDir**: `string`

Defined in: [packages/core/src/types.ts:547](https://github.com/wadakatu/screenbook/blob/4ba6a4e3732f38bc073b7e86b10e48c6943abce4/packages/core/src/types.ts#L547)

Output directory for generated files

#### Default

```ts
".screenbook"
```

#### Examples

```ts
".screenbook"
```

```ts
"dist/screenbook"
```

***

### routesFile?

> `optional` **routesFile**: `string`

Defined in: [packages/core/src/types.ts:575](https://github.com/wadakatu/screenbook/blob/4ba6a4e3732f38bc073b7e86b10e48c6943abce4/packages/core/src/types.ts#L575)

Path to a router configuration file (for config-based routing).
Use this for frameworks like Vue Router, React Router, etc.
Cannot be used together with routesPattern.

#### Examples

```ts
"src/router/routes.ts"
```

```ts
"src/router/index.ts"
```

***

### routesPattern?

> `optional` **routesPattern**: `string`

Defined in: [packages/core/src/types.ts:566](https://github.com/wadakatu/screenbook/blob/4ba6a4e3732f38bc073b7e86b10e48c6943abce4/packages/core/src/types.ts#L566)

Glob pattern for route files (for generate/lint commands).
Use this for file-based routing frameworks (Next.js, Nuxt, Remix, etc.).
Cannot be used together with routesFile.

#### Examples

```ts
"src/pages/**/page.tsx"
```

```ts
"app/**/page.tsx"
```

```ts
"src/routes/**/*.tsx"
```
