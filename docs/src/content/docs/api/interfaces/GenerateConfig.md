---
editUrl: false
next: false
prev: false
title: "GenerateConfig"
---

Defined in: [packages/core/src/types.ts:531](https://github.com/wadakatu/screenbook/blob/c85a713dc70e0f0d165325d15609b83855385f7f/packages/core/src/types.ts#L531)

Configuration for screen ID generation in the generate command.
Controls how route parameters like `:id` are converted to screen IDs.

## Example

```ts
const generate: GenerateConfig = {
  smartParameterNaming: true,
  parameterMapping: { ":id": "detail", ":userId": "user" },
}
```

## Properties

### parameterMapping?

> `optional` **parameterMapping**: `Record`\<`` `:${string}` ``, `string`\>

Defined in: [packages/core/src/types.ts:549](https://github.com/wadakatu/screenbook/blob/c85a713dc70e0f0d165325d15609b83855385f7f/packages/core/src/types.ts#L549)

Custom parameter mappings for screen ID generation.
Maps route parameter names (must start with `:`) to semantic screen ID segments.
Takes precedence over smart defaults when both are enabled.

#### Example

```ts
{ ":id": "detail", ":userId": "user", ":postId": "post" }
```

***

### smartParameterNaming?

> `optional` **smartParameterNaming**: `boolean`

Defined in: [packages/core/src/types.ts:541](https://github.com/wadakatu/screenbook/blob/c85a713dc70e0f0d165325d15609b83855385f7f/packages/core/src/types.ts#L541)

Enable smart parameter inference for screen IDs.
When true, applies intelligent defaults:
- `:id` at path end → `detail`
- `:xxxId` pattern → extracts entity name (e.g., `:userId` → `user`)
- `:id` before action segments (edit/new) → preserved for context

#### Default

```ts
false (preserves backward compatibility)
```

#### Example

```ts
true
```

***

### unmappedParameterStrategy?

> `optional` **unmappedParameterStrategy**: `"warn"` \| `"preserve"` \| `"detail"`

Defined in: [packages/core/src/types.ts:559](https://github.com/wadakatu/screenbook/blob/c85a713dc70e0f0d165325d15609b83855385f7f/packages/core/src/types.ts#L559)

Strategy for handling parameters not covered by mappings or smart defaults.
- "preserve": Keep the parameter name as-is (e.g., `:userId` → `userId`) (default)
- "detail": Convert all unmapped parameters to "detail"
- "warn": Preserve but add a TODO comment suggesting alternatives

#### Default

```ts
"preserve"
```

#### Example

```ts
"warn"
```
