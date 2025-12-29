---
editUrl: false
next: false
prev: false
title: "ConfigInput"
---

Defined in: [packages/core/src/types.ts:479](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L479)

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

Defined in: [packages/core/src/types.ts:509](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L509)

Progressive adoption configuration

***

### ignore?

> `optional` **ignore**: `string`[]

Defined in: [packages/core/src/types.ts:504](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L504)

Patterns to ignore when scanning.
Defaults to node_modules and .git directories.

***

### metaPattern?

> `optional` **metaPattern**: `string`

Defined in: [packages/core/src/types.ts:492](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L492)

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

Defined in: [packages/core/src/types.ts:485](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L485)

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

Defined in: [packages/core/src/types.ts:498](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L498)

Glob pattern for route files (for generate/lint commands)

#### Example

```ts
"src/pages/**/page.tsx"
```
