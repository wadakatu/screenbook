---
editUrl: false
next: false
prev: false
title: "defineScreen"
---

> **defineScreen**(`input`): [`Screen`](/screenbook/api/interfaces/screen/)

Defined in: [packages/core/src/defineScreen.ts:46](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/defineScreen.ts#L46)

Define a screen with metadata for the screen catalog.

When a `mock` definition is provided, navigation targets (`navigateTo`, `itemNavigateTo`, `rowNavigateTo`)
are automatically extracted and used as the `next` field. If `mock` is not provided,
the manually defined `next` field is used instead.

## Parameters

### input

[`Screen`](/screenbook/api/interfaces/screen/)

## Returns

[`Screen`](/screenbook/api/interfaces/screen/)

## Example

```ts
// Without mock - manual next definition
export const screen = defineScreen({
  id: "billing.invoice.detail",
  title: "Invoice Detail",
  route: "/billing/invoices/:id",
  next: ["billing.invoice.edit"],
})

// With mock - next is auto-derived from navigateTo
export const screen = defineScreen({
  id: "billing.invoice.detail",
  title: "Invoice Detail",
  route: "/billing/invoices/:id",
  mock: {
    sections: [
      {
        elements: [
          { type: "button", label: "Edit", navigateTo: "billing.invoice.edit" },
        ],
      },
    ],
  },
})
// => next is automatically ["billing.invoice.edit"]
```
