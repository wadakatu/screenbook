---
editUrl: false
next: false
prev: false
title: "defineScreen"
---

> **defineScreen**(`input`): [`Screen`](/screenbook/api/interfaces/screen/)

Defined in: [packages/core/src/defineScreen.ts:27](https://github.com/wadakatu/screenbook/blob/3aa533645cd6d8fdb5f73efa62fdf2e698b71072/packages/core/src/defineScreen.ts#L27)

Define a screen with metadata for the screen catalog.

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
})
```
