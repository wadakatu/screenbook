---
editUrl: false
next: false
prev: false
title: "defineConfig"
---

> **defineConfig**(`input`): [`Config`](/screenbook/api/interfaces/config/)

Defined in: [packages/core/src/defineScreen.ts:68](https://github.com/wadakatu/screenbook/blob/0fda59c011aab5f6efc357d9181c480c84f6a890/packages/core/src/defineScreen.ts#L68)

Define Screenbook configuration.

## Parameters

### input

[`ConfigInput`](/screenbook/api/interfaces/configinput/) = `{}`

## Returns

[`Config`](/screenbook/api/interfaces/config/)

## Example

```ts
export default defineConfig({
  screensDir: "src/screens",
  outDir: ".screenbook",
  metaPattern: "**/screen.meta.ts",
})
```
