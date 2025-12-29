---
editUrl: false
next: false
prev: false
title: "MockImageElement"
---

Defined in: [packages/core/src/types.ts:118](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L118)

Image placeholder element

## Extends

- `MockElementBase`

## Properties

### aspectRatio?

> `optional` **aspectRatio**: `string`

Defined in: [packages/core/src/types.ts:125](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L125)

Aspect ratio hint for the placeholder

#### Examples

```ts
"16:9"
```

```ts
"1:1"
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

### type

> **type**: `"image"`

Defined in: [packages/core/src/types.ts:119](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L119)

Element type identifier

#### Overrides

`MockElementBase.type`
