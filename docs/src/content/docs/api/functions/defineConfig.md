---
editUrl: false
next: false
prev: false
title: "defineConfig"
---

> **defineConfig**(`input`): [`Config`](/screenbook/api/interfaces/config/)

Defined in: [packages/core/src/defineScreen.ts:43](https://github.com/wadakatu/screenbook/blob/5a6f8062d0f7d5758d04167870e521d7dae17830/packages/core/src/defineScreen.ts#L43)

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
