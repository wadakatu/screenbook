---
editUrl: false
next: false
prev: false
title: "MockListElement"
---

Defined in: [packages/core/src/types.ts:208](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L208)

List element for displaying multiple items

## Extends

- `MockElementBase`

## Properties

### itemCount?

> `optional` **itemCount**: `number`

Defined in: [packages/core/src/types.ts:211](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L211)

Number of items to display (default: 3)

***

### itemNavigateTo?

> `optional` **itemNavigateTo**: `string`

Defined in: [packages/core/src/types.ts:213](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L213)

Screen ID to navigate to when an item is clicked

***

### label

> **label**: `string`

Defined in: [packages/core/src/types.ts:153](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L153)

Display label for the element

#### Inherited from

`MockElementBase.label`

***

### type

> **type**: `"list"`

Defined in: [packages/core/src/types.ts:209](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L209)

Element type identifier

#### Overrides

`MockElementBase.type`
