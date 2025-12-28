---
editUrl: false
next: false
prev: false
title: "configSchema"
---

> `const` **configSchema**: `ZodObject`\<\{ `adoption`: `ZodOptional`\<`ZodObject`\<\{ `includePatterns`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; `minimumCoverage`: `ZodOptional`\<`ZodNumber`\>; `mode`: `ZodDefault`\<`ZodEnum`\<\{ `full`: `"full"`; `progressive`: `"progressive"`; \}\>\>; \}, `$strip`\>\>; `ignore`: `ZodDefault`\<`ZodArray`\<`ZodString`\>\>; `metaPattern`: `ZodDefault`\<`ZodString`\>; `outDir`: `ZodDefault`\<`ZodString`\>; `routesPattern`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>

Defined in: [packages/core/src/types.ts:88](https://github.com/wadakatu/screenbook/blob/7ee23424a5c0768602877d6e3e06c2e39abbaf4f/packages/core/src/types.ts#L88)

Schema for Screenbook configuration
