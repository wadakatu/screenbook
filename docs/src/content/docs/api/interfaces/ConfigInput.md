---
editUrl: false
next: false
prev: false
title: "ConfigInput"
---

Defined in: [packages/core/src/types.ts:632](https://github.com/wadakatu/screenbook/blob/6005b6bc35a5bb21b6a450ee7633658b30cb36bf/packages/core/src/types.ts#L632)

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

Defined in: [packages/core/src/types.ts:678](https://github.com/wadakatu/screenbook/blob/6005b6bc35a5bb21b6a450ee7633658b30cb36bf/packages/core/src/types.ts#L678)

Progressive adoption configuration

***

### apiIntegration?

> `optional` **apiIntegration**: [`ApiIntegrationConfig`](/screenbook/api/interfaces/apiintegrationconfig/)

Defined in: [packages/core/src/types.ts:684](https://github.com/wadakatu/screenbook/blob/6005b6bc35a5bb21b6a450ee7633658b30cb36bf/packages/core/src/types.ts#L684)

API integration configuration for auto-detecting dependencies
from OpenAPI-generated clients

***

### excludePatterns?

> `optional` **excludePatterns**: `string`[]

Defined in: [packages/core/src/types.ts:673](https://github.com/wadakatu/screenbook/blob/6005b6bc35a5bb21b6a450ee7633658b30cb36bf/packages/core/src/types.ts#L673)

Patterns to exclude from route detection.

#### See

https://github.com/wadakatu/screenbook/issues/190

***

### ignore?

> `optional` **ignore**: `string`[]

Defined in: [packages/core/src/types.ts:667](https://github.com/wadakatu/screenbook/blob/6005b6bc35a5bb21b6a450ee7633658b30cb36bf/packages/core/src/types.ts#L667)

Patterns to ignore when scanning.
Defaults to node_modules and .git directories.

***

### lint?

> `optional` **lint**: [`LintConfig`](/screenbook/api/interfaces/lintconfig/)

Defined in: [packages/core/src/types.ts:689](https://github.com/wadakatu/screenbook/blob/6005b6bc35a5bb21b6a450ee7633658b30cb36bf/packages/core/src/types.ts#L689)

Lint configuration for controlling warning behavior

***

### metaPattern?

> `optional` **metaPattern**: `string`

Defined in: [packages/core/src/types.ts:645](https://github.com/wadakatu/screenbook/blob/6005b6bc35a5bb21b6a450ee7633658b30cb36bf/packages/core/src/types.ts#L645)

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

Defined in: [packages/core/src/types.ts:638](https://github.com/wadakatu/screenbook/blob/6005b6bc35a5bb21b6a450ee7633658b30cb36bf/packages/core/src/types.ts#L638)

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

Defined in: [packages/core/src/types.ts:661](https://github.com/wadakatu/screenbook/blob/6005b6bc35a5bb21b6a450ee7633658b30cb36bf/packages/core/src/types.ts#L661)

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

Defined in: [packages/core/src/types.ts:653](https://github.com/wadakatu/screenbook/blob/6005b6bc35a5bb21b6a450ee7633658b30cb36bf/packages/core/src/types.ts#L653)

Glob pattern for route files (for generate/lint commands).
Use this for file-based routing frameworks.
Cannot be used together with routesFile.

#### Example

```ts
"src/pages/**/page.tsx"
```
