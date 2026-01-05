---
editUrl: false
next: false
prev: false
title: "MockButtonElement"
---

Defined in: [packages/core/src/types.ts:171](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L171)

Button element with optional navigation and styling

## Extends

- `MockElementBase`

## Properties

### label

> **label**: `string`

Defined in: [packages/core/src/types.ts:165](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L165)

Display label for the element

#### Inherited from

`MockElementBase.label`

***

### navigateTo?

> `optional` **navigateTo**: `string`

Defined in: [packages/core/src/types.ts:174](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L174)

Screen ID to navigate to when clicked

***

### type

> **type**: `"button"`

Defined in: [packages/core/src/types.ts:172](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L172)

Element type identifier

#### Overrides

`MockElementBase.type`

***

### variant?

> `optional` **variant**: `"primary"` \| `"secondary"` \| `"danger"`

Defined in: [packages/core/src/types.ts:176](https://github.com/wadakatu/screenbook/blob/af484fb5ff60b2152a66636fa6b54441fb1d41de/packages/core/src/types.ts#L176)

Visual style variant
