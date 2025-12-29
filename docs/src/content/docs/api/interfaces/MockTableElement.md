---
editUrl: false
next: false
prev: false
title: "MockTableElement"
---

Defined in: [packages/core/src/types.ts:147](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L147)

Table element - for tabular data display

## Extends

- `MockElementBase`

## Properties

### columns?

> `optional` **columns**: `string`[]

Defined in: [packages/core/src/types.ts:153](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L153)

Column headers

#### Example

```ts
["Name", "Email", "Status"]
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

### rowCount?

> `optional` **rowCount**: `number`

Defined in: [packages/core/src/types.ts:158](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L158)

Number of placeholder rows to show

#### Default

```ts
3
```

***

### rowNavigateTo?

> `optional` **rowNavigateTo**: `string`

Defined in: [packages/core/src/types.ts:162](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L162)

Screen ID to navigate to when a row is clicked

***

### type

> **type**: `"table"`

Defined in: [packages/core/src/types.ts:148](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L148)

Element type identifier

#### Overrides

`MockElementBase.type`
