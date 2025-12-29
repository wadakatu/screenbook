---
editUrl: false
next: false
prev: false
title: "ScreenMock"
---

Defined in: [packages/core/src/types.ts:217](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L217)

Complete mock definition for a screen wireframe

## Example

```ts
const mock: ScreenMock = {
  sections: [
    {
      title: "Header",
      layout: "horizontal",
      elements: [
        { type: "text", label: "Invoice #123", variant: "heading" },
        { type: "button", label: "Edit", navigateTo: "billing.invoice.edit" },
      ],
    },
  ],
}
```

## Properties

### sections

> **sections**: [`MockSection`](/screenbook/api/interfaces/mocksection/)[]

Defined in: [packages/core/src/types.ts:221](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L221)

Sections that compose the screen wireframe
