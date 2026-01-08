---
editUrl: false
next: false
prev: false
title: "defineConfig"
---

> **defineConfig**(`input`): [`Config`](/screenbook/api/interfaces/config/)

Defined in: [packages/core/src/defineScreen.ts:68](https://github.com/wadakatu/screenbook/blob/4ba6a4e3732f38bc073b7e86b10e48c6943abce4/packages/core/src/defineScreen.ts#L68)

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
