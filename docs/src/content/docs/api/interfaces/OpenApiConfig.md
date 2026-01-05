---
editUrl: false
next: false
prev: false
title: "OpenApiConfig"
---

Defined in: [packages/core/src/types.ts:460](https://github.com/wadakatu/screenbook/blob/55cd66e5c88355be5d519e1630f75ec6b3f364a5/packages/core/src/types.ts#L460)

OpenAPI specification configuration for validating dependsOn references.

## Example

```ts
const openapi: OpenApiConfig = {
  sources: ["./openapi.yaml", "https://api.example.com/openapi.json"],
}
```

## Properties

### sources

> `readonly` **sources**: readonly `string`[]

Defined in: [packages/core/src/types.ts:467](https://github.com/wadakatu/screenbook/blob/55cd66e5c88355be5d519e1630f75ec6b3f364a5/packages/core/src/types.ts#L467)

OpenAPI specification sources (local files or remote URLs).
Supports OpenAPI 2.0 (Swagger) and 3.x specifications.

#### Examples

```ts
["./openapi.yaml"]
```

```ts
["./openapi.yaml", "https://api.example.com/openapi.json"]
```
