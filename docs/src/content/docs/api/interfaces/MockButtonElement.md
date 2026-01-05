---
editUrl: false
next: false
prev: false
title: "MockButtonElement"
---

Defined in: [packages/core/src/types.ts:159](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L159)

Button element with optional navigation and styling

## Extends

- `MockElementBase`

## Properties

### label

> **label**: `string`

Defined in: [packages/core/src/types.ts:153](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L153)

Display label for the element

#### Inherited from

`MockElementBase.label`

***

### navigateTo?

> `optional` **navigateTo**: `string`

Defined in: [packages/core/src/types.ts:162](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L162)

Screen ID to navigate to when clicked

***

### type

> **type**: `"button"`

Defined in: [packages/core/src/types.ts:160](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L160)

Element type identifier

#### Overrides

`MockElementBase.type`

***

### variant?

> `optional` **variant**: `"primary"` \| `"secondary"` \| `"danger"`

Defined in: [packages/core/src/types.ts:164](https://github.com/wadakatu/screenbook/blob/ab8b8bc6a7c88609223c3b2f1bea15f6e8e8bd8d/packages/core/src/types.ts#L164)

Visual style variant
