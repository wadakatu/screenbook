---
editUrl: false
next: false
prev: false
title: "Screen"
---

Defined in: [packages/core/src/types.ts:49](https://github.com/wadakatu/screenbook/blob/ef23c0f12ae1a1d049097d28de425394d6bc08ee/packages/core/src/types.ts#L49)

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

Defined in: [packages/core/src/types.ts:115](https://github.com/wadakatu/screenbook/blob/ef23c0f12ae1a1d049097d28de425394d6bc08ee/packages/core/src/types.ts#L115)

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

Defined in: [packages/core/src/types.ts:93](https://github.com/wadakatu/screenbook/blob/ef23c0f12ae1a1d049097d28de425394d6bc08ee/packages/core/src/types.ts#L93)

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

Defined in: [packages/core/src/types.ts:121](https://github.com/wadakatu/screenbook/blob/ef23c0f12ae1a1d049097d28de425394d6bc08ee/packages/core/src/types.ts#L121)

Optional description explaining the screen's purpose

#### Example

```ts
"Displays detailed invoice information including line items and payment status"
```

***

### entryPoints?

> `optional` **entryPoints**: `string`[]

Defined in: [packages/core/src/types.ts:100](https://github.com/wadakatu/screenbook/blob/ef23c0f12ae1a1d049097d28de425394d6bc08ee/packages/core/src/types.ts#L100)

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

Defined in: [packages/core/src/types.ts:56](https://github.com/wadakatu/screenbook/blob/ef23c0f12ae1a1d049097d28de425394d6bc08ee/packages/core/src/types.ts#L56)

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

> `optional` **links**: [`ScreenLink`](/screenbook/api/interfaces/screenlink/)[]

Defined in: [packages/core/src/types.ts:127](https://github.com/wadakatu/screenbook/blob/ef23c0f12ae1a1d049097d28de425394d6bc08ee/packages/core/src/types.ts#L127)

Links to external resources like Storybook, Figma, or documentation

#### Example

```ts
[{ label: "Figma", url: "https://figma.com/file/..." }]
```

***

### mock?

> `optional` **mock**: [`ScreenMock`](/screenbook/api/interfaces/screenmock/)

Defined in: [packages/core/src/types.ts:134](https://github.com/wadakatu/screenbook/blob/ef23c0f12ae1a1d049097d28de425394d6bc08ee/packages/core/src/types.ts#L134)

Wireframe-level mock definition for UI documentation.
When defined, navigation targets (navigateTo, itemNavigateTo, rowNavigateTo)
are automatically extracted and merged into the `next` array.

***

### next?

> `optional` **next**: `string`[]

Defined in: [packages/core/src/types.ts:107](https://github.com/wadakatu/screenbook/blob/ef23c0f12ae1a1d049097d28de425394d6bc08ee/packages/core/src/types.ts#L107)

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

Defined in: [packages/core/src/types.ts:79](https://github.com/wadakatu/screenbook/blob/ef23c0f12ae1a1d049097d28de425394d6bc08ee/packages/core/src/types.ts#L79)

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

Defined in: [packages/core/src/types.ts:72](https://github.com/wadakatu/screenbook/blob/ef23c0f12ae1a1d049097d28de425394d6bc08ee/packages/core/src/types.ts#L72)

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

Defined in: [packages/core/src/types.ts:86](https://github.com/wadakatu/screenbook/blob/ef23c0f12ae1a1d049097d28de425394d6bc08ee/packages/core/src/types.ts#L86)

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

Defined in: [packages/core/src/types.ts:64](https://github.com/wadakatu/screenbook/blob/ef23c0f12ae1a1d049097d28de425394d6bc08ee/packages/core/src/types.ts#L64)

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
