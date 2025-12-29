---
editUrl: false
next: false
prev: false
title: "Config"
---

Defined in: [packages/core/src/types.ts:428](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L428)

Screenbook configuration options.

## Properties

### adoption?

> `optional` **adoption**: [`AdoptionConfig`](/screenbook/api/interfaces/adoptionconfig/)

Defined in: [packages/core/src/types.ts:464](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L464)

Progressive adoption configuration for gradual rollout

#### Example

```ts
{ mode: "progressive", includePatterns: ["src/pages/billing/**"], minimumCoverage: 80 }
```

***

### ignore

> **ignore**: `string`[]

Defined in: [packages/core/src/types.ts:458](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L458)

Patterns to ignore when scanning (glob patterns).
Defaults to node_modules and .git directories.

***

### metaPattern

> **metaPattern**: `string`

Defined in: [packages/core/src/types.ts:444](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L444)

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

Defined in: [packages/core/src/types.ts:435](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L435)

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

Defined in: [packages/core/src/types.ts:452](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L452)

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
