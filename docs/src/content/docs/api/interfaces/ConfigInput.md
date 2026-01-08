---
editUrl: false
next: false
prev: false
title: "ConfigInput"
---

Defined in: [packages/core/src/types.ts:623](https://github.com/wadakatu/screenbook/blob/4ba6a4e3732f38bc073b7e86b10e48c6943abce4/packages/core/src/types.ts#L623)

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

Defined in: [packages/core/src/types.ts:669](https://github.com/wadakatu/screenbook/blob/4ba6a4e3732f38bc073b7e86b10e48c6943abce4/packages/core/src/types.ts#L669)

Progressive adoption configuration

***

### apiIntegration?

> `optional` **apiIntegration**: [`ApiIntegrationConfig`](/screenbook/api/interfaces/apiintegrationconfig/)

Defined in: [packages/core/src/types.ts:675](https://github.com/wadakatu/screenbook/blob/4ba6a4e3732f38bc073b7e86b10e48c6943abce4/packages/core/src/types.ts#L675)

API integration configuration for auto-detecting dependencies
from OpenAPI-generated clients

***

### excludePatterns?

> `optional` **excludePatterns**: `string`[]

Defined in: [packages/core/src/types.ts:664](https://github.com/wadakatu/screenbook/blob/4ba6a4e3732f38bc073b7e86b10e48c6943abce4/packages/core/src/types.ts#L664)

Patterns to exclude from route detection.

#### See

https://github.com/wadakatu/screenbook/issues/190

***

### ignore?

> `optional` **ignore**: `string`[]

Defined in: [packages/core/src/types.ts:658](https://github.com/wadakatu/screenbook/blob/4ba6a4e3732f38bc073b7e86b10e48c6943abce4/packages/core/src/types.ts#L658)

Patterns to ignore when scanning.
Defaults to node_modules and .git directories.

***

### lint?

> `optional` **lint**: [`LintConfig`](/screenbook/api/interfaces/lintconfig/)

Defined in: [packages/core/src/types.ts:680](https://github.com/wadakatu/screenbook/blob/4ba6a4e3732f38bc073b7e86b10e48c6943abce4/packages/core/src/types.ts#L680)

Lint configuration for controlling warning behavior

***

### metaPattern?

> `optional` **metaPattern**: `string`

Defined in: [packages/core/src/types.ts:636](https://github.com/wadakatu/screenbook/blob/4ba6a4e3732f38bc073b7e86b10e48c6943abce4/packages/core/src/types.ts#L636)

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

Defined in: [packages/core/src/types.ts:629](https://github.com/wadakatu/screenbook/blob/4ba6a4e3732f38bc073b7e86b10e48c6943abce4/packages/core/src/types.ts#L629)

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

Defined in: [packages/core/src/types.ts:652](https://github.com/wadakatu/screenbook/blob/4ba6a4e3732f38bc073b7e86b10e48c6943abce4/packages/core/src/types.ts#L652)

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

Defined in: [packages/core/src/types.ts:644](https://github.com/wadakatu/screenbook/blob/4ba6a4e3732f38bc073b7e86b10e48c6943abce4/packages/core/src/types.ts#L644)

Glob pattern for route files (for generate/lint commands).
Use this for file-based routing frameworks.
Cannot be used together with routesFile.

#### Example

```ts
"src/pages/**/page.tsx"
```
