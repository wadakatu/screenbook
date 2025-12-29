---
editUrl: false
next: false
prev: false
title: "ConfigInput"
---

Defined in: [packages/core/src/types.ts:251](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L251)

Input type for defineConfig function.
All fields with defaults are optional in input.

## Example

```ts
defineConfig({
  metaPattern: "app/**/screen.meta.ts",
  routesPattern: "app/**/page.tsx",
})
```

## Properties

### adoption?

> `optional` **adoption**: [`AdoptionConfig`](/screenbook/api/interfaces/adoptionconfig/)

Defined in: [packages/core/src/types.ts:281](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L281)

Progressive adoption configuration

***

### ignore?

> `optional` **ignore**: `string`[]

Defined in: [packages/core/src/types.ts:276](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L276)

Patterns to ignore when scanning.
Defaults to node_modules and .git directories.

***

### metaPattern?

> `optional` **metaPattern**: `string`

Defined in: [packages/core/src/types.ts:264](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L264)

Glob pattern for screen metadata files

#### Default

```ts
"src/**/screen.meta.ts"
```

#### Example

```ts
"app/**/screen.meta.ts"
```

***

### outDir?

> `optional` **outDir**: `string`

Defined in: [packages/core/src/types.ts:257](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L257)

Output directory for generated files

#### Default

```ts
".screenbook"
```

#### Example

```ts
".screenbook"
```

***

### routesPattern?

> `optional` **routesPattern**: `string`

Defined in: [packages/core/src/types.ts:270](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L270)

Glob pattern for route files (for generate/lint commands)

#### Example

```ts
"src/pages/**/page.tsx"
```
