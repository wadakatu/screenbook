---
editUrl: false
next: false
prev: false
title: "AdoptionConfig"
---

Defined in: [packages/core/src/types.ts:389](https://github.com/wadakatu/screenbook/blob/51f11f04e0c13fe988a91bca8f446a2b61a5c8c4/packages/core/src/types.ts#L389)

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

Defined in: [packages/core/src/types.ts:405](https://github.com/wadakatu/screenbook/blob/51f11f04e0c13fe988a91bca8f446a2b61a5c8c4/packages/core/src/types.ts#L405)

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

Defined in: [packages/core/src/types.ts:412](https://github.com/wadakatu/screenbook/blob/51f11f04e0c13fe988a91bca8f446a2b61a5c8c4/packages/core/src/types.ts#L412)

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

Defined in: [packages/core/src/types.ts:398](https://github.com/wadakatu/screenbook/blob/51f11f04e0c13fe988a91bca8f446a2b61a5c8c4/packages/core/src/types.ts#L398)

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
