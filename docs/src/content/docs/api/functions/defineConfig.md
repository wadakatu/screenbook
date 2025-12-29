---
editUrl: false
next: false
prev: false
title: "defineConfig"
---

> **defineConfig**(`input`): [`Config`](/screenbook/api/interfaces/config/)

Defined in: [packages/core/src/defineScreen.ts:72](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/defineScreen.ts#L72)

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
