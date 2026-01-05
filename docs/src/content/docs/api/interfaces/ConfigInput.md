---
editUrl: false
next: false
prev: false
title: "ConfigInput"
---

Defined in: [packages/core/src/types.ts:587](https://github.com/wadakatu/screenbook/blob/55cd66e5c88355be5d519e1630f75ec6b3f364a5/packages/core/src/types.ts#L587)

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

Defined in: [packages/core/src/types.ts:627](https://github.com/wadakatu/screenbook/blob/55cd66e5c88355be5d519e1630f75ec6b3f364a5/packages/core/src/types.ts#L627)

Progressive adoption configuration

***

### apiIntegration?

> `optional` **apiIntegration**: [`ApiIntegrationConfig`](/screenbook/api/interfaces/apiintegrationconfig/)

Defined in: [packages/core/src/types.ts:633](https://github.com/wadakatu/screenbook/blob/55cd66e5c88355be5d519e1630f75ec6b3f364a5/packages/core/src/types.ts#L633)

API integration configuration for auto-detecting dependencies
from OpenAPI-generated clients

***

### ignore?

> `optional` **ignore**: `string`[]

Defined in: [packages/core/src/types.ts:622](https://github.com/wadakatu/screenbook/blob/55cd66e5c88355be5d519e1630f75ec6b3f364a5/packages/core/src/types.ts#L622)

Patterns to ignore when scanning.
Defaults to node_modules and .git directories.

***

### metaPattern?

> `optional` **metaPattern**: `string`

Defined in: [packages/core/src/types.ts:600](https://github.com/wadakatu/screenbook/blob/55cd66e5c88355be5d519e1630f75ec6b3f364a5/packages/core/src/types.ts#L600)

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

Defined in: [packages/core/src/types.ts:593](https://github.com/wadakatu/screenbook/blob/55cd66e5c88355be5d519e1630f75ec6b3f364a5/packages/core/src/types.ts#L593)

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

### routesFile?

> `optional` **routesFile**: `string`

Defined in: [packages/core/src/types.ts:616](https://github.com/wadakatu/screenbook/blob/55cd66e5c88355be5d519e1630f75ec6b3f364a5/packages/core/src/types.ts#L616)

Path to a router configuration file (for config-based routing).
Use this for frameworks like Vue Router, React Router, etc.
Cannot be used together with routesPattern.

#### Example

```ts
"src/router/routes.ts"
```

***

### routesPattern?

> `optional` **routesPattern**: `string`

Defined in: [packages/core/src/types.ts:608](https://github.com/wadakatu/screenbook/blob/55cd66e5c88355be5d519e1630f75ec6b3f364a5/packages/core/src/types.ts#L608)

Glob pattern for route files (for generate/lint commands).
Use this for file-based routing frameworks.
Cannot be used together with routesFile.

#### Example

```ts
"src/pages/**/page.tsx"
```
