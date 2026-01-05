---
editUrl: false
next: false
prev: false
title: "Config"
---

Defined in: [packages/core/src/types.ts:468](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L468)

Screenbook configuration options.

## Properties

### adoption?

> `optional` **adoption**: [`AdoptionConfig`](/screenbook/api/interfaces/adoptionconfig/)

Defined in: [packages/core/src/types.ts:515](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L515)

Progressive adoption configuration for gradual rollout

#### Example

```ts
{ mode: "progressive", includePatterns: ["src/pages/billing/**"], minimumCoverage: 80 }
```

***

### apiIntegration?

> `optional` **apiIntegration**: [`ApiIntegrationConfig`](/screenbook/api/interfaces/apiintegrationconfig/)

Defined in: [packages/core/src/types.ts:522](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L522)

API integration configuration for auto-detecting dependencies
from OpenAPI-generated clients (Orval, openapi-typescript, etc.)

#### Example

```ts
{ clientPackages: ["@/api/generated"] }
```

***

### ignore

> **ignore**: `string`[]

Defined in: [packages/core/src/types.ts:509](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L509)

Patterns to ignore when scanning (glob patterns).
Defaults to node_modules and .git directories.

***

### metaPattern

> **metaPattern**: `string`

Defined in: [packages/core/src/types.ts:484](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L484)

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

Defined in: [packages/core/src/types.ts:475](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L475)

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

Defined in: [packages/core/src/types.ts:503](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L503)

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

Defined in: [packages/core/src/types.ts:494](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L494)

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
