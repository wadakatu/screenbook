---
editUrl: false
next: false
prev: false
title: "ConfigInput"
---

Defined in: [packages/core/src/types.ts:242](https://github.com/wadakatu/screenbook/blob/5a6f8062d0f7d5758d04167870e521d7dae17830/packages/core/src/types.ts#L242)

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

Defined in: [packages/core/src/types.ts:272](https://github.com/wadakatu/screenbook/blob/5a6f8062d0f7d5758d04167870e521d7dae17830/packages/core/src/types.ts#L272)

Progressive adoption configuration

***

### ignore?

> `optional` **ignore**: `string`[]

Defined in: [packages/core/src/types.ts:267](https://github.com/wadakatu/screenbook/blob/5a6f8062d0f7d5758d04167870e521d7dae17830/packages/core/src/types.ts#L267)

Patterns to ignore when scanning.
Defaults to node_modules and .git directories.

***

### metaPattern?

> `optional` **metaPattern**: `string`

Defined in: [packages/core/src/types.ts:255](https://github.com/wadakatu/screenbook/blob/5a6f8062d0f7d5758d04167870e521d7dae17830/packages/core/src/types.ts#L255)

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

Defined in: [packages/core/src/types.ts:248](https://github.com/wadakatu/screenbook/blob/5a6f8062d0f7d5758d04167870e521d7dae17830/packages/core/src/types.ts#L248)

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

Defined in: [packages/core/src/types.ts:261](https://github.com/wadakatu/screenbook/blob/5a6f8062d0f7d5758d04167870e521d7dae17830/packages/core/src/types.ts#L261)

Glob pattern for route files (for generate/lint commands)

#### Example

```ts
"src/pages/**/page.tsx"
```
