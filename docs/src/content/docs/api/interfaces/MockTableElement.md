---
editUrl: false
next: false
prev: false
title: "MockTableElement"
---

Defined in: [packages/core/src/types.ts:231](https://github.com/wadakatu/screenbook/blob/0fda59c011aab5f6efc357d9181c480c84f6a890/packages/core/src/types.ts#L231)

Table element for displaying tabular data

## Extends

- `MockElementBase`

## Properties

### columns?

> `optional` **columns**: `string`[]

Defined in: [packages/core/src/types.ts:234](https://github.com/wadakatu/screenbook/blob/0fda59c011aab5f6efc357d9181c480c84f6a890/packages/core/src/types.ts#L234)

Column headers

***

### label

> **label**: `string`

Defined in: [packages/core/src/types.ts:165](https://github.com/wadakatu/screenbook/blob/0fda59c011aab5f6efc357d9181c480c84f6a890/packages/core/src/types.ts#L165)

Display label for the element

#### Inherited from

`MockElementBase.label`

***

### rowCount?

> `optional` **rowCount**: `number`

Defined in: [packages/core/src/types.ts:236](https://github.com/wadakatu/screenbook/blob/0fda59c011aab5f6efc357d9181c480c84f6a890/packages/core/src/types.ts#L236)

Number of rows to display (default: 3)

***

### rowNavigateTo?

> `optional` **rowNavigateTo**: `string`

Defined in: [packages/core/src/types.ts:238](https://github.com/wadakatu/screenbook/blob/0fda59c011aab5f6efc357d9181c480c84f6a890/packages/core/src/types.ts#L238)

Screen ID to navigate to when a row is clicked

***

### type

> **type**: `"table"`

Defined in: [packages/core/src/types.ts:232](https://github.com/wadakatu/screenbook/blob/0fda59c011aab5f6efc357d9181c480c84f6a890/packages/core/src/types.ts#L232)

Element type identifier

#### Overrides

`MockElementBase.type`
