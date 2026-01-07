---
editUrl: false
next: false
prev: false
title: "defineScreen"
---

> **defineScreen**(`input`): [`Screen`](/screenbook/api/interfaces/screen/)

Defined in: [packages/core/src/defineScreen.ts:39](https://github.com/wadakatu/screenbook/blob/0fda59c011aab5f6efc357d9181c480c84f6a890/packages/core/src/defineScreen.ts#L39)

Define a screen with metadata for the screen catalog.

When a `mock` is defined, navigation targets (navigateTo, itemNavigateTo,
rowNavigateTo) are automatically extracted and merged into the `next` array.

## Parameters

### input

[`Screen`](/screenbook/api/interfaces/screen/)

## Returns

[`Screen`](/screenbook/api/interfaces/screen/)

## Example

```ts
export const screen = defineScreen({
  id: "billing.invoice.detail",
  title: "Invoice Detail",
  route: "/billing/invoices/:id",
  owner: ["billing"],
  tags: ["billing", "invoice"],
  dependsOn: ["InvoiceAPI.getDetail"],
  entryPoints: ["billing.invoice.list"],
  next: ["billing.invoice.edit"],
  mock: {
    sections: [{
      elements: [
        { type: "button", label: "Pay", navigateTo: "billing.payment.start" },
      ],
    }],
  },
})
// next will be ["billing.invoice.edit", "billing.payment.start"]
```
