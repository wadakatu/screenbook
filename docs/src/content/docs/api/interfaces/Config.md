---
editUrl: false
next: false
prev: false
title: "Config"
---

Defined in: [packages/core/src/types.ts:518](https://github.com/wadakatu/screenbook/blob/4297cef1bf18ac5352258b2adf457cafe1df7d79/packages/core/src/types.ts#L518)

Screenbook configuration options.

## Properties

### adoption?

> `optional` **adoption**: [`AdoptionConfig`](/screenbook/api/interfaces/adoptionconfig/)

Defined in: [packages/core/src/types.ts:565](https://github.com/wadakatu/screenbook/blob/4297cef1bf18ac5352258b2adf457cafe1df7d79/packages/core/src/types.ts#L565)

Progressive adoption configuration for gradual rollout

#### Example

```ts
{ mode: "progressive", includePatterns: ["src/pages/billing/**"], minimumCoverage: 80 }
```

***

### apiIntegration?

> `optional` **apiIntegration**: [`ApiIntegrationConfig`](/screenbook/api/interfaces/apiintegrationconfig/)

Defined in: [packages/core/src/types.ts:572](https://github.com/wadakatu/screenbook/blob/4297cef1bf18ac5352258b2adf457cafe1df7d79/packages/core/src/types.ts#L572)

API integration configuration for auto-detecting dependencies
from OpenAPI-generated clients (Orval, openapi-typescript, etc.)

#### Example

```ts
{ clientPackages: ["@/api/generated"] }
```

***

### ignore

> **ignore**: `string`[]

Defined in: [packages/core/src/types.ts:559](https://github.com/wadakatu/screenbook/blob/4297cef1bf18ac5352258b2adf457cafe1df7d79/packages/core/src/types.ts#L559)

Patterns to ignore when scanning (glob patterns).
Defaults to node_modules and .git directories.

***

### metaPattern

> **metaPattern**: `string`

Defined in: [packages/core/src/types.ts:534](https://github.com/wadakatu/screenbook/blob/4297cef1bf18ac5352258b2adf457cafe1df7d79/packages/core/src/types.ts#L534)

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

Defined in: [packages/core/src/types.ts:525](https://github.com/wadakatu/screenbook/blob/4297cef1bf18ac5352258b2adf457cafe1df7d79/packages/core/src/types.ts#L525)

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

Defined in: [packages/core/src/types.ts:553](https://github.com/wadakatu/screenbook/blob/4297cef1bf18ac5352258b2adf457cafe1df7d79/packages/core/src/types.ts#L553)

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

Defined in: [packages/core/src/types.ts:544](https://github.com/wadakatu/screenbook/blob/4297cef1bf18ac5352258b2adf457cafe1df7d79/packages/core/src/types.ts#L544)

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
