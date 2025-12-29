---
editUrl: false
next: false
prev: false
title: "MockInputElement"
---

Defined in: [packages/core/src/types.ts:78](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L78)

Input element - text field, textarea, etc.

## Extends

- `MockElementBase`

## Properties

### inputType?

> `optional` **inputType**: `"text"` \| `"email"` \| `"password"` \| `"textarea"` \| `"search"`

Defined in: [packages/core/src/types.ts:88](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L88)

Input subtype hint for rendering

#### Default

```ts
"text"
```

***

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

### placeholder?

> `optional` **placeholder**: `string`

Defined in: [packages/core/src/types.ts:83](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L83)

Placeholder text shown when empty

***

### type

> **type**: `"input"`

Defined in: [packages/core/src/types.ts:79](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L79)

Element type identifier

#### Overrides

`MockElementBase.type`
