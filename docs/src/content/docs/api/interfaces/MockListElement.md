---
editUrl: false
next: false
prev: false
title: "MockListElement"
---

Defined in: [packages/core/src/types.ts:131](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L131)

List element - for displaying repeated items

## Extends

- `MockElementBase`

## Properties

### itemCount?

> `optional` **itemCount**: `number`

Defined in: [packages/core/src/types.ts:137](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L137)

Number of placeholder items to show

#### Default

```ts
3
```

***

### itemNavigateTo?

> `optional` **itemNavigateTo**: `string`

Defined in: [packages/core/src/types.ts:141](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L141)

Screen ID to navigate to when an item is clicked

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

> **type**: `"list"`

Defined in: [packages/core/src/types.ts:132](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L132)

Element type identifier

#### Overrides

`MockElementBase.type`
