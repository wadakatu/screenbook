---
editUrl: false
next: false
prev: false
title: "ConfigInput"
---

Defined in: [packages/core/src/types.ts:550](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L550)

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

Defined in: [packages/core/src/types.ts:590](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L590)

Progressive adoption configuration

***

### apiIntegration?

> `optional` **apiIntegration**: [`ApiIntegrationConfig`](/screenbook/api/interfaces/apiintegrationconfig/)

Defined in: [packages/core/src/types.ts:596](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L596)

API integration configuration for auto-detecting dependencies
from OpenAPI-generated clients

***

### ignore?

> `optional` **ignore**: `string`[]

Defined in: [packages/core/src/types.ts:585](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L585)

Patterns to ignore when scanning.
Defaults to node_modules and .git directories.

***

### metaPattern?

> `optional` **metaPattern**: `string`

Defined in: [packages/core/src/types.ts:563](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L563)

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

Defined in: [packages/core/src/types.ts:556](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L556)

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

Defined in: [packages/core/src/types.ts:579](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L579)

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

Defined in: [packages/core/src/types.ts:571](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L571)

Glob pattern for route files (for generate/lint commands).
Use this for file-based routing frameworks.
Cannot be used together with routesFile.

#### Example

```ts
"src/pages/**/page.tsx"
```
