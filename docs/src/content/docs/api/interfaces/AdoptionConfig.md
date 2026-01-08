---
editUrl: false
next: false
prev: false
title: "AdoptionConfig"
---

Defined in: [packages/core/src/types.ts:402](https://github.com/wadakatu/screenbook/blob/6005b6bc35a5bb21b6a450ee7633658b30cb36bf/packages/core/src/types.ts#L402)

Progressive adoption configuration for gradual rollout.

## Example

```ts
const adoption: AdoptionConfig = {
  mode: "progressive",
  includePatterns: ["src/pages/billing/**"],
  minimumCoverage: 80,
}
```

## Properties

### includePatterns?

> `optional` **includePatterns**: `string`[]

Defined in: [packages/core/src/types.ts:418](https://github.com/wadakatu/screenbook/blob/6005b6bc35a5bb21b6a450ee7633658b30cb36bf/packages/core/src/types.ts#L418)

Glob patterns to include for coverage checking (progressive mode only)

#### Examples

```ts
["src/pages/billing/**"]
```

```ts
["src/pages/auth/**", "src/pages/settings/**"]
```

***

### minimumCoverage?

> `optional` **minimumCoverage**: `number`

Defined in: [packages/core/src/types.ts:425](https://github.com/wadakatu/screenbook/blob/6005b6bc35a5bb21b6a450ee7633658b30cb36bf/packages/core/src/types.ts#L425)

Minimum coverage percentage required to pass lint (0-100)

#### Examples

```ts
80
```

```ts
100
```

***

### mode?

> `optional` **mode**: `"full"` \| `"progressive"`

Defined in: [packages/core/src/types.ts:411](https://github.com/wadakatu/screenbook/blob/6005b6bc35a5bb21b6a450ee7633658b30cb36bf/packages/core/src/types.ts#L411)

Adoption mode for screen metadata coverage
- `"full"`: All routes must have screen.meta.ts (default)
- `"progressive"`: Only check coverage within includePatterns

#### Default

```ts
"full"
```

#### Examples

```ts
"full"
```

```ts
"progressive"
```
