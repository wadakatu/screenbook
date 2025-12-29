---
editUrl: false
next: false
prev: false
title: "MockButtonElement"
---

Defined in: [packages/core/src/types.ts:61](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L61)

Button element - can trigger navigation to another screen

## Extends

- `MockElementBase`

## Properties

### label

> **label**: `string`

Defined in: [packages/core/src/types.ts:55](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L55)

Display label or content for the element

#### Examples

```ts
"Submit"
```

```ts
"Search..."
```

#### Inherited from

`MockElementBase.label`

***

### navigateTo?

> `optional` **navigateTo**: `string`

Defined in: [packages/core/src/types.ts:67](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L67)

Screen ID to navigate to when clicked

#### Example

```ts
"billing.invoice.edit"
```

***

### type

> **type**: `"button"`

Defined in: [packages/core/src/types.ts:62](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L62)

Element type identifier

#### Overrides

`MockElementBase.type`

***

### variant?

> `optional` **variant**: `"primary"` \| `"secondary"` \| `"danger"`

Defined in: [packages/core/src/types.ts:72](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L72)

Button variant for styling hints

#### Default

```ts
"secondary"
```
