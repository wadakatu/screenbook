---
editUrl: false
next: false
prev: false
title: "ApiIntegrationConfig"
---

Defined in: [packages/core/src/types.ts:437](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L437)

API integration configuration for auto-detecting dependencies from
OpenAPI-generated clients (Orval, openapi-typescript, etc.).

## Example

```ts
const apiIntegration: ApiIntegrationConfig = {
  clientPackages: ["@/api/generated", "@company/backend-client"],
  extractApiName: (name) => name.replace(/^use/, ""),
}
```

## Properties

### clientPackages

> **clientPackages**: `string`[]

Defined in: [packages/core/src/types.ts:444](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L444)

Package names to scan for API client imports.
These should match the import paths used in your code.

#### Examples

```ts
["@/api/generated"]
```

```ts
["@company/backend-client", "@company/auth-client"]
```

***

### extractApiName()?

> `optional` **extractApiName**: (`importName`) => `string`

Defined in: [packages/core/src/types.ts:452](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L452)

Optional transform function to convert import name to dependsOn format.
If not provided, the import name is used as-is.

#### Parameters

##### importName

`string`

#### Returns

`string`

#### Examples

```ts
(name) => name.replace(/^use/, "")
```

```ts
(name) => `API.${name}`
```
