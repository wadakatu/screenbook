---
editUrl: false
next: false
prev: false
title: "Config"
---

Defined in: [packages/core/src/types.ts:191](https://github.com/wadakatu/screenbook/blob/304a54cb1545d1a2928b1abeb26e7ccfc81fbab4/packages/core/src/types.ts#L191)

Screenbook configuration options.

## Properties

### adoption?

> `optional` **adoption**: [`AdoptionConfig`](/screenbook/api/interfaces/adoptionconfig/)

Defined in: [packages/core/src/types.ts:227](https://github.com/wadakatu/screenbook/blob/304a54cb1545d1a2928b1abeb26e7ccfc81fbab4/packages/core/src/types.ts#L227)

Progressive adoption configuration for gradual rollout

#### Example

```ts
{ mode: "progressive", includePatterns: ["src/pages/billing/**"], minimumCoverage: 80 }
```

***

### ignore

> **ignore**: `string`[]

Defined in: [packages/core/src/types.ts:221](https://github.com/wadakatu/screenbook/blob/304a54cb1545d1a2928b1abeb26e7ccfc81fbab4/packages/core/src/types.ts#L221)

Patterns to ignore when scanning (glob patterns).
Defaults to node_modules and .git directories.

***

### metaPattern

> **metaPattern**: `string`

Defined in: [packages/core/src/types.ts:207](https://github.com/wadakatu/screenbook/blob/304a54cb1545d1a2928b1abeb26e7ccfc81fbab4/packages/core/src/types.ts#L207)

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

Defined in: [packages/core/src/types.ts:198](https://github.com/wadakatu/screenbook/blob/304a54cb1545d1a2928b1abeb26e7ccfc81fbab4/packages/core/src/types.ts#L198)

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

Defined in: [packages/core/src/types.ts:215](https://github.com/wadakatu/screenbook/blob/304a54cb1545d1a2928b1abeb26e7ccfc81fbab4/packages/core/src/types.ts#L215)

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
