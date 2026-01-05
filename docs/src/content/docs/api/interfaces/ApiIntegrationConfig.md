---
editUrl: false
next: false
prev: false
title: "ApiIntegrationConfig"
---

Defined in: [packages/core/src/types.ts:450](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L450)

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

Defined in: [packages/core/src/types.ts:457](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L457)

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

Defined in: [packages/core/src/types.ts:465](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L465)

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
