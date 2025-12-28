---
editUrl: false
next: false
prev: false
title: "defineConfig"
---

> **defineConfig**(`input`): [`Config`](/screenbook/api/interfaces/config/)

Defined in: [packages/core/src/defineScreen.ts:43](https://github.com/wadakatu/screenbook/blob/304a54cb1545d1a2928b1abeb26e7ccfc81fbab4/packages/core/src/defineScreen.ts#L43)

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
