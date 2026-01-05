---
editUrl: false
next: false
prev: false
title: "MockListElement"
---

Defined in: [packages/core/src/types.ts:220](https://github.com/wadakatu/screenbook/blob/4297cef1bf18ac5352258b2adf457cafe1df7d79/packages/core/src/types.ts#L220)

List element for displaying multiple items

## Extends

- `MockElementBase`

## Properties

### itemCount?

> `optional` **itemCount**: `number`

Defined in: [packages/core/src/types.ts:223](https://github.com/wadakatu/screenbook/blob/4297cef1bf18ac5352258b2adf457cafe1df7d79/packages/core/src/types.ts#L223)

Number of items to display (default: 3)

***

### itemNavigateTo?

> `optional` **itemNavigateTo**: `string`

Defined in: [packages/core/src/types.ts:225](https://github.com/wadakatu/screenbook/blob/4297cef1bf18ac5352258b2adf457cafe1df7d79/packages/core/src/types.ts#L225)

Screen ID to navigate to when an item is clicked

***

### label

> **label**: `string`

Defined in: [packages/core/src/types.ts:165](https://github.com/wadakatu/screenbook/blob/4297cef1bf18ac5352258b2adf457cafe1df7d79/packages/core/src/types.ts#L165)

Display label for the element

#### Inherited from

`MockElementBase.label`

***

### type

> **type**: `"list"`

Defined in: [packages/core/src/types.ts:221](https://github.com/wadakatu/screenbook/blob/4297cef1bf18ac5352258b2adf457cafe1df7d79/packages/core/src/types.ts#L221)

Element type identifier

#### Overrides

`MockElementBase.type`
