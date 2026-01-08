---
editUrl: false
next: false
prev: false
title: "LintConfig"
---

Defined in: [packages/core/src/types.ts:499](https://github.com/wadakatu/screenbook/blob/0fda59c011aab5f6efc357d9181c480c84f6a890/packages/core/src/types.ts#L499)

Lint configuration for controlling warning behavior.

## Properties

### orphans?

> `optional` **orphans**: `"error"` \| `"warn"` \| `"off"`

Defined in: [packages/core/src/types.ts:507](https://github.com/wadakatu/screenbook/blob/0fda59c011aab5f6efc357d9181c480c84f6a890/packages/core/src/types.ts#L507)

Control orphan screen detection behavior.
- "warn": Show warnings for orphan screens (default)
- "off": Disable orphan screen warnings
- "error": Treat orphan screens as errors (fail lint)

#### Default

```ts
"warn"
```
