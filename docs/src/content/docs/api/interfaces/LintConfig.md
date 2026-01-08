---
editUrl: false
next: false
prev: false
title: "LintConfig"
---

Defined in: [packages/core/src/types.ts:499](https://github.com/wadakatu/screenbook/blob/6005b6bc35a5bb21b6a450ee7633658b30cb36bf/packages/core/src/types.ts#L499)

Lint configuration for controlling warning behavior.

## Properties

### orphans?

> `optional` **orphans**: `"error"` \| `"warn"` \| `"off"`

Defined in: [packages/core/src/types.ts:507](https://github.com/wadakatu/screenbook/blob/6005b6bc35a5bb21b6a450ee7633658b30cb36bf/packages/core/src/types.ts#L507)

Control orphan screen detection behavior.
- "warn": Show warnings for orphan screens (default)
- "off": Disable orphan screen warnings
- "error": Treat orphan screens as errors (fail lint)

#### Default

```ts
"warn"
```

***

### spreadOperator?

> `optional` **spreadOperator**: `"warn"` \| `"off"`

Defined in: [packages/core/src/types.ts:515](https://github.com/wadakatu/screenbook/blob/6005b6bc35a5bb21b6a450ee7633658b30cb36bf/packages/core/src/types.ts#L515)

Control spread operator warning behavior in route parsing.
- "warn": Show detailed warnings when spread operators are detected (default)
- "off": Suppress spread operator warnings

#### Default

```ts
"warn"
```
