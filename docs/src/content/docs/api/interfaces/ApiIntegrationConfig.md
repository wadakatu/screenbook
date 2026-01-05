---
editUrl: false
next: false
prev: false
title: "ApiIntegrationConfig"
---

Defined in: [packages/core/src/types.ts:470](https://github.com/wadakatu/screenbook/blob/4297cef1bf18ac5352258b2adf457cafe1df7d79/packages/core/src/types.ts#L470)

## Properties

### clientPackages?

> `optional` **clientPackages**: `string`[]

Defined in: [packages/core/src/types.ts:477](https://github.com/wadakatu/screenbook/blob/4297cef1bf18ac5352258b2adf457cafe1df7d79/packages/core/src/types.ts#L477)

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

Defined in: [packages/core/src/types.ts:485](https://github.com/wadakatu/screenbook/blob/4297cef1bf18ac5352258b2adf457cafe1df7d79/packages/core/src/types.ts#L485)

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

***

### openapi?

> `optional` **openapi**: [`OpenApiConfig`](/screenbook/api/interfaces/openapiconfig/)

Defined in: [packages/core/src/types.ts:493](https://github.com/wadakatu/screenbook/blob/4297cef1bf18ac5352258b2adf457cafe1df7d79/packages/core/src/types.ts#L493)

OpenAPI specification configuration for validating dependsOn references.
When configured, `screenbook lint` will validate that dependsOn values
match operationIds or HTTP method + path from the OpenAPI spec.

#### Example

```ts
{ sources: ["./openapi.yaml"] }
```
