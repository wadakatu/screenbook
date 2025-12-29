---
editUrl: false
next: false
prev: false
title: "Config"
---

Defined in: [packages/core/src/types.ts:200](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L200)

Screenbook configuration options.

## Properties

### adoption?

> `optional` **adoption**: [`AdoptionConfig`](/screenbook/api/interfaces/adoptionconfig/)

Defined in: [packages/core/src/types.ts:236](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L236)

Progressive adoption configuration for gradual rollout

#### Example

```ts
{ mode: "progressive", includePatterns: ["src/pages/billing/**"], minimumCoverage: 80 }
```

***

### ignore

> **ignore**: `string`[]

Defined in: [packages/core/src/types.ts:230](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L230)

Patterns to ignore when scanning (glob patterns).
Defaults to node_modules and .git directories.

***

### metaPattern

> **metaPattern**: `string`

Defined in: [packages/core/src/types.ts:216](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L216)

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

Defined in: [packages/core/src/types.ts:207](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L207)

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

### routesPattern?

> `optional` **routesPattern**: `string`

Defined in: [packages/core/src/types.ts:224](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L224)

Glob pattern for route files (for generate/lint commands)

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
