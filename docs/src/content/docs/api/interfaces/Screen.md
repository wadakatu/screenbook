---
editUrl: false
next: false
prev: false
title: "Screen"
---

Defined in: [packages/core/src/types.ts:37](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L37)

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

Defined in: [packages/core/src/types.ts:103](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L103)

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

Defined in: [packages/core/src/types.ts:81](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L81)

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

Defined in: [packages/core/src/types.ts:109](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L109)

Optional description explaining the screen's purpose

#### Example

```ts
"Displays detailed invoice information including line items and payment status"
```

***

### entryPoints?

> `optional` **entryPoints**: `string`[]

Defined in: [packages/core/src/types.ts:88](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L88)

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

Defined in: [packages/core/src/types.ts:44](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L44)

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

Defined in: [packages/core/src/types.ts:115](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L115)

Links to external resources like Storybook, Figma, or documentation

#### Example

```ts
[{ label: "Figma", url: "https://figma.com/file/..." }]
```

***

### next?

> `optional` **next**: `string`[]

Defined in: [packages/core/src/types.ts:95](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L95)

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

Defined in: [packages/core/src/types.ts:67](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L67)

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

Defined in: [packages/core/src/types.ts:60](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L60)

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

Defined in: [packages/core/src/types.ts:74](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L74)

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

Defined in: [packages/core/src/types.ts:52](https://github.com/wadakatu/screenbook/blob/80ed6bad308e61bc775211dba9e5241b3fd47533/packages/core/src/types.ts#L52)

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
