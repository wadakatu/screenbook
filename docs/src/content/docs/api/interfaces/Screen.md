---
editUrl: false
next: false
prev: false
title: "Screen"
---

Defined in: [packages/core/src/types.ts:244](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L244)

Screen metadata definition for the screen catalog.

## Example

```ts
const screen: Screen = {
  id: "billing.invoice.detail",
  title: "Invoice Detail",
  route: "/billing/invoices/:id",
  owner: ["billing-team"],
  tags: ["billing", "invoice"],
  dependsOn: ["InvoiceAPI.getDetail"],
  next: ["billing.invoice.edit"],
}
```

## Properties

### allowCycles?

> `optional` **allowCycles**: `boolean`

Defined in: [packages/core/src/types.ts:310](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L310)

Allow circular navigation involving this screen.
When true, cycles that include this screen will not trigger warnings.

#### Default

```ts
false
```

#### Example

```ts
true
```

***

### dependsOn?

> `optional` **dependsOn**: `string`[]

Defined in: [packages/core/src/types.ts:288](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L288)

APIs or services this screen depends on for impact analysis

#### Examples

```ts
["InvoiceAPI.getDetail", "PaymentAPI.getStatus"]
```

```ts
["UserAPI.getProfile"]
```

***

### description?

> `optional` **description**: `string`

Defined in: [packages/core/src/types.ts:316](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L316)

Optional description explaining the screen's purpose

#### Example

```ts
"Displays detailed invoice information including line items and payment status"
```

***

### entryPoints?

> `optional` **entryPoints**: `string`[]

Defined in: [packages/core/src/types.ts:295](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L295)

Screen IDs that can navigate to this screen (incoming edges)

#### Examples

```ts
["billing.invoice.list"]
```

```ts
["dashboard.home", "nav.sidebar"]
```

***

### id

> **id**: `string`

Defined in: [packages/core/src/types.ts:251](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L251)

Unique identifier for the screen using dot notation

#### Examples

```ts
"billing.invoice.detail"
```

```ts
"auth.login"
```

```ts
"settings.profile"
```

***

### links?

> `optional` **links**: `ScreenLink`[]

Defined in: [packages/core/src/types.ts:322](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L322)

Links to external resources like Storybook, Figma, or documentation

#### Example

```ts
[{ label: "Figma", url: "https://figma.com/file/..." }]
```

***

### mock?

> `optional` **mock**: [`ScreenMock`](/screenbook/api/interfaces/screenmock/)

Defined in: [packages/core/src/types.ts:345](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L345)

Mock wireframe definition for the screen.
Used for visual representation in navigation graphs and screen detail pages.
When defined, navigation targets (navigateTo) are automatically extracted to populate the `next` field.

#### Example

```ts
mock: {
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

***

### next?

> `optional` **next**: `string`[]

Defined in: [packages/core/src/types.ts:302](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L302)

Screen IDs this screen can navigate to (outgoing edges)

#### Examples

```ts
["billing.invoice.edit", "billing.payment.start"]
```

```ts
["billing.invoice.list"]
```

***

### owner?

> `optional` **owner**: `string`[]

Defined in: [packages/core/src/types.ts:274](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L274)

Team(s) or domain(s) that own this screen

#### Examples

```ts
["billing-team"]
```

```ts
["platform", "billing"]
```

***

### route

> **route**: `string`

Defined in: [packages/core/src/types.ts:267](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L267)

Route path pattern with optional dynamic segments

#### Examples

```ts
"/billing/invoices/:id"
```

```ts
"/auth/login"
```

```ts
"/settings/profile"
```

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [packages/core/src/types.ts:281](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L281)

Tags for categorization and filtering in the catalog

#### Examples

```ts
["billing", "invoice"]
```

```ts
["auth", "security"]
```

***

### title

> **title**: `string`

Defined in: [packages/core/src/types.ts:259](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L259)

Human-readable title displayed in the screen catalog

#### Examples

```ts
"Invoice Detail"
```

```ts
"Login"
```

```ts
"User Profile Settings"
```
