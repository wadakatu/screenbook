---
editUrl: false
next: false
prev: false
title: "Config"
---

Defined in: [packages/core/src/types.ts:481](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L481)

Screenbook configuration options.

## Properties

### adoption?

> `optional` **adoption**: [`AdoptionConfig`](/screenbook/api/interfaces/adoptionconfig/)

Defined in: [packages/core/src/types.ts:528](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L528)

Progressive adoption configuration for gradual rollout

#### Example

```ts
{ mode: "progressive", includePatterns: ["src/pages/billing/**"], minimumCoverage: 80 }
```

***

### apiIntegration?

> `optional` **apiIntegration**: [`ApiIntegrationConfig`](/screenbook/api/interfaces/apiintegrationconfig/)

Defined in: [packages/core/src/types.ts:535](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L535)

API integration configuration for auto-detecting dependencies
from OpenAPI-generated clients (Orval, openapi-typescript, etc.)

#### Example

```ts
{ clientPackages: ["@/api/generated"] }
```

***

### ignore

> **ignore**: `string`[]

Defined in: [packages/core/src/types.ts:522](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L522)

Patterns to ignore when scanning (glob patterns).
Defaults to node_modules and .git directories.

***

### metaPattern

> **metaPattern**: `string`

Defined in: [packages/core/src/types.ts:497](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L497)

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

Defined in: [packages/core/src/types.ts:488](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L488)

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

Defined in: [packages/core/src/types.ts:516](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L516)

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

Defined in: [packages/core/src/types.ts:507](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L507)

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
