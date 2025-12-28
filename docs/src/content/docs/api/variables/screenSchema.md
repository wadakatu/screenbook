---
editUrl: false
next: false
prev: false
title: "screenSchema"
---

> `const` **screenSchema**: `ZodObject`\<\{ `dependsOn`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; `description`: `ZodOptional`\<`ZodString`\>; `entryPoints`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; `id`: `ZodString`; `links`: `ZodOptional`\<`ZodArray`\<`ZodObject`\<\{ `label`: `ZodString`; `url`: `ZodString`; \}, `$strip`\>\>\>; `next`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; `owner`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; `route`: `ZodString`; `tags`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; `title`: `ZodString`; \}, `$strip`\>

Defined in: [packages/core/src/types.ts:6](https://github.com/wadakatu/screenbook/blob/7ee23424a5c0768602877d6e3e06c2e39abbaf4f/packages/core/src/types.ts#L6)

Schema for screen metadata definition
