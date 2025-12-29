---
editUrl: false
next: false
prev: false
title: "MockTableElement"
---

Defined in: [packages/core/src/types.ts:219](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L219)

Table element for displaying tabular data

## Extends

- `MockElementBase`

## Properties

### columns?

> `optional` **columns**: `string`[]

Defined in: [packages/core/src/types.ts:222](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L222)

Column headers

***

### label

> **label**: `string`

Defined in: [packages/core/src/types.ts:153](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L153)

Display label for the element

#### Inherited from

`MockElementBase.label`

***

### rowCount?

> `optional` **rowCount**: `number`

Defined in: [packages/core/src/types.ts:224](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L224)

Number of rows to display (default: 3)

***

### rowNavigateTo?

> `optional` **rowNavigateTo**: `string`

Defined in: [packages/core/src/types.ts:226](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L226)

Screen ID to navigate to when a row is clicked

***

### type

> **type**: `"table"`

Defined in: [packages/core/src/types.ts:220](https://github.com/wadakatu/screenbook/blob/97bbcadcb1d6bfacd665bf2c8086acfbfa058a7e/packages/core/src/types.ts#L220)

Element type identifier

#### Overrides

`MockElementBase.type`
