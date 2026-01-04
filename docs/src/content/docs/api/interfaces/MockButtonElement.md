---
editUrl: false
next: false
prev: false
title: "MockButtonElement"
---

Defined in: [packages/core/src/types.ts:159](https://github.com/wadakatu/screenbook/blob/51f11f04e0c13fe988a91bca8f446a2b61a5c8c4/packages/core/src/types.ts#L159)

Button element with optional navigation and styling

## Extends

- `MockElementBase`

## Properties

### label

> **label**: `string`

Defined in: [packages/core/src/types.ts:153](https://github.com/wadakatu/screenbook/blob/51f11f04e0c13fe988a91bca8f446a2b61a5c8c4/packages/core/src/types.ts#L153)

Display label for the element

#### Inherited from

`MockElementBase.label`

***

### navigateTo?

> `optional` **navigateTo**: `string`

Defined in: [packages/core/src/types.ts:162](https://github.com/wadakatu/screenbook/blob/51f11f04e0c13fe988a91bca8f446a2b61a5c8c4/packages/core/src/types.ts#L162)

Screen ID to navigate to when clicked

***

### type

> **type**: `"button"`

Defined in: [packages/core/src/types.ts:160](https://github.com/wadakatu/screenbook/blob/51f11f04e0c13fe988a91bca8f446a2b61a5c8c4/packages/core/src/types.ts#L160)

Element type identifier

#### Overrides

`MockElementBase.type`

***

### variant?

> `optional` **variant**: `"primary"` \| `"secondary"` \| `"danger"`

Defined in: [packages/core/src/types.ts:164](https://github.com/wadakatu/screenbook/blob/51f11f04e0c13fe988a91bca8f446a2b61a5c8c4/packages/core/src/types.ts#L164)

Visual style variant
