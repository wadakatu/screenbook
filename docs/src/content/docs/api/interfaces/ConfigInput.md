---
editUrl: false
next: false
prev: false
title: "ConfigInput"
---

Defined in: [packages/core/src/types.ts:537](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L537)

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

Defined in: [packages/core/src/types.ts:577](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L577)

Progressive adoption configuration

***

### apiIntegration?

> `optional` **apiIntegration**: [`ApiIntegrationConfig`](/screenbook/api/interfaces/apiintegrationconfig/)

Defined in: [packages/core/src/types.ts:583](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L583)

API integration configuration for auto-detecting dependencies
from OpenAPI-generated clients

***

### ignore?

> `optional` **ignore**: `string`[]

Defined in: [packages/core/src/types.ts:572](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L572)

Patterns to ignore when scanning.
Defaults to node_modules and .git directories.

***

### metaPattern?

> `optional` **metaPattern**: `string`

Defined in: [packages/core/src/types.ts:550](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L550)

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

Defined in: [packages/core/src/types.ts:543](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L543)

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

Defined in: [packages/core/src/types.ts:566](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L566)

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

Defined in: [packages/core/src/types.ts:558](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L558)

Glob pattern for route files (for generate/lint commands).
Use this for file-based routing frameworks.
Cannot be used together with routesFile.

#### Example

```ts
"src/pages/**/page.tsx"
```
