---
editUrl: false
next: false
prev: false
title: "AdoptionConfig"
---

Defined in: [packages/core/src/types.ts:161](https://github.com/wadakatu/screenbook/blob/b46f17911c7424f697e59b3c5c1e4a9e75b6b7c3/packages/core/src/types.ts#L161)

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

Defined in: [packages/core/src/types.ts:177](https://github.com/wadakatu/screenbook/blob/b46f17911c7424f697e59b3c5c1e4a9e75b6b7c3/packages/core/src/types.ts#L177)

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

Defined in: [packages/core/src/types.ts:184](https://github.com/wadakatu/screenbook/blob/b46f17911c7424f697e59b3c5c1e4a9e75b6b7c3/packages/core/src/types.ts#L184)

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

Defined in: [packages/core/src/types.ts:170](https://github.com/wadakatu/screenbook/blob/b46f17911c7424f697e59b3c5c1e4a9e75b6b7c3/packages/core/src/types.ts#L170)

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
