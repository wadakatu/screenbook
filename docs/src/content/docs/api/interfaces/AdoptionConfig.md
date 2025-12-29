---
editUrl: false
next: false
prev: false
title: "AdoptionConfig"
---

Defined in: [packages/core/src/types.ts:507](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L507)

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

Defined in: [packages/core/src/types.ts:523](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L523)

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

Defined in: [packages/core/src/types.ts:530](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L530)

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

Defined in: [packages/core/src/types.ts:516](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L516)

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
