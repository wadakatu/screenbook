---
editUrl: false
next: false
prev: false
title: "OpenApiConfig"
---

Defined in: [packages/core/src/types.ts:460](https://github.com/wadakatu/screenbook/blob/6005b6bc35a5bb21b6a450ee7633658b30cb36bf/packages/core/src/types.ts#L460)

OpenAPI specification configuration for validating dependsOn references.

## Example

```ts
const openapi: OpenApiConfig = {
  sources: ["./openapi.yaml", "https://api.example.com/openapi.json"],
}
```

## Properties

### sources

> **sources**: `string`[]

Defined in: [packages/core/src/types.ts:467](https://github.com/wadakatu/screenbook/blob/6005b6bc35a5bb21b6a450ee7633658b30cb36bf/packages/core/src/types.ts#L467)

OpenAPI specification sources (local files or remote URLs).
Supports OpenAPI 2.0 (Swagger) and 3.x specifications.

#### Examples

```ts
["./openapi.yaml"]
```

```ts
["./openapi.yaml", "https://api.example.com/openapi.json"]
```
