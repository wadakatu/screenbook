---
editUrl: false
next: false
prev: false
title: "AdoptionConfig"
---

Defined in: [packages/core/src/types.ts:152](https://github.com/wadakatu/screenbook/blob/5a6f8062d0f7d5758d04167870e521d7dae17830/packages/core/src/types.ts#L152)

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

Defined in: [packages/core/src/types.ts:168](https://github.com/wadakatu/screenbook/blob/5a6f8062d0f7d5758d04167870e521d7dae17830/packages/core/src/types.ts#L168)

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

Defined in: [packages/core/src/types.ts:175](https://github.com/wadakatu/screenbook/blob/5a6f8062d0f7d5758d04167870e521d7dae17830/packages/core/src/types.ts#L175)

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

Defined in: [packages/core/src/types.ts:161](https://github.com/wadakatu/screenbook/blob/5a6f8062d0f7d5758d04167870e521d7dae17830/packages/core/src/types.ts#L161)

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
