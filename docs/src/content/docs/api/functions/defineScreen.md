---
editUrl: false
next: false
prev: false
title: "defineScreen"
---

> **defineScreen**(`input`): `object`

Defined in: [packages/core/src/defineScreen.ts:27](https://github.com/wadakatu/screenbook/blob/7ee23424a5c0768602877d6e3e06c2e39abbaf4f/packages/core/src/defineScreen.ts#L27)

Define a screen with metadata for the screen catalog.

## Parameters

### input

#### dependsOn?

`string`[] = `...`

APIs or services this screen depends on

#### description?

`string` = `...`

Optional description of the screen

#### entryPoints?

`string`[] = `...`

Screen IDs that can navigate to this screen

#### id

`string` = `...`

Unique identifier for the screen (e.g., "billing.invoice.detail")

#### links?

`object`[] = `...`

Links to external resources (Storybook, Figma, etc.)

#### next?

`string`[] = `...`

Screen IDs this screen can navigate to

#### owner?

`string`[] = `...`

Team(s) or domain(s) that own this screen

#### route

`string` = `...`

Route path pattern (e.g., "/billing/invoices/:id")

#### tags?

`string`[] = `...`

Tags for categorization and filtering

#### title

`string` = `...`

Human-readable title of the screen

## Returns

### dependsOn?

> `optional` **dependsOn**: `string`[]

APIs or services this screen depends on

### description?

> `optional` **description**: `string`

Optional description of the screen

### entryPoints?

> `optional` **entryPoints**: `string`[]

Screen IDs that can navigate to this screen

### id

> **id**: `string`

Unique identifier for the screen (e.g., "billing.invoice.detail")

### links?

> `optional` **links**: `object`[]

Links to external resources (Storybook, Figma, etc.)

### next?

> `optional` **next**: `string`[]

Screen IDs this screen can navigate to

### owner?

> `optional` **owner**: `string`[]

Team(s) or domain(s) that own this screen

### route

> **route**: `string`

Route path pattern (e.g., "/billing/invoices/:id")

### tags?

> `optional` **tags**: `string`[]

Tags for categorization and filtering

### title

> **title**: `string`

Human-readable title of the screen

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
