---
editUrl: false
next: false
prev: false
title: "ConfigInput"
---

Defined in: [packages/core/src/types.ts:615](https://github.com/wadakatu/screenbook/blob/0fda59c011aab5f6efc357d9181c480c84f6a890/packages/core/src/types.ts#L615)

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

Defined in: [packages/core/src/types.ts:655](https://github.com/wadakatu/screenbook/blob/0fda59c011aab5f6efc357d9181c480c84f6a890/packages/core/src/types.ts#L655)

Progressive adoption configuration

***

### apiIntegration?

> `optional` **apiIntegration**: [`ApiIntegrationConfig`](/screenbook/api/interfaces/apiintegrationconfig/)

Defined in: [packages/core/src/types.ts:661](https://github.com/wadakatu/screenbook/blob/0fda59c011aab5f6efc357d9181c480c84f6a890/packages/core/src/types.ts#L661)

API integration configuration for auto-detecting dependencies
from OpenAPI-generated clients

***

### ignore?

> `optional` **ignore**: `string`[]

Defined in: [packages/core/src/types.ts:650](https://github.com/wadakatu/screenbook/blob/0fda59c011aab5f6efc357d9181c480c84f6a890/packages/core/src/types.ts#L650)

Patterns to ignore when scanning.
Defaults to node_modules and .git directories.

***

### lint?

> `optional` **lint**: [`LintConfig`](/screenbook/api/interfaces/lintconfig/)

Defined in: [packages/core/src/types.ts:666](https://github.com/wadakatu/screenbook/blob/0fda59c011aab5f6efc357d9181c480c84f6a890/packages/core/src/types.ts#L666)

Lint configuration for controlling warning behavior

***

### metaPattern?

> `optional` **metaPattern**: `string`

Defined in: [packages/core/src/types.ts:628](https://github.com/wadakatu/screenbook/blob/0fda59c011aab5f6efc357d9181c480c84f6a890/packages/core/src/types.ts#L628)

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

Defined in: [packages/core/src/types.ts:621](https://github.com/wadakatu/screenbook/blob/0fda59c011aab5f6efc357d9181c480c84f6a890/packages/core/src/types.ts#L621)

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

Defined in: [packages/core/src/types.ts:644](https://github.com/wadakatu/screenbook/blob/0fda59c011aab5f6efc357d9181c480c84f6a890/packages/core/src/types.ts#L644)

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

Defined in: [packages/core/src/types.ts:636](https://github.com/wadakatu/screenbook/blob/0fda59c011aab5f6efc357d9181c480c84f6a890/packages/core/src/types.ts#L636)

Glob pattern for route files (for generate/lint commands).
Use this for file-based routing frameworks.
Cannot be used together with routesFile.

#### Example

```ts
"src/pages/**/page.tsx"
```
