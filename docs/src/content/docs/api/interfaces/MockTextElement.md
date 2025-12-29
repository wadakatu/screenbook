---
editUrl: false
next: false
prev: false
title: "MockTextElement"
---

Defined in: [packages/core/src/types.ts:106](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L106)

Text element - static text display (headings, labels, body text)

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

### type

> **type**: `"text"`

Defined in: [packages/core/src/types.ts:107](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L107)

Element type identifier

#### Overrides

`MockElementBase.type`

***

### variant?

> `optional` **variant**: `"heading"` \| `"subheading"` \| `"body"` \| `"caption"`

Defined in: [packages/core/src/types.ts:112](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L112)

Text variant for styling hints

#### Default

```ts
"body"
```
