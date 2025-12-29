---
editUrl: false
next: false
prev: false
title: "MockLinkElement"
---

Defined in: [packages/core/src/types.ts:94](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L94)

Link element - can trigger navigation to another screen

## Extends

- `MockElementBase`

## Properties

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

### navigateTo?

> `optional` **navigateTo**: `string`

Defined in: [packages/core/src/types.ts:100](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L100)

Screen ID to navigate to when clicked

#### Example

```ts
"settings.profile"
```

***

### type

> **type**: `"link"`

Defined in: [packages/core/src/types.ts:95](https://github.com/wadakatu/screenbook/blob/7458caa0341a34cbc04a2da58e98f73ab73b4d43/packages/core/src/types.ts#L95)

Element type identifier

#### Overrides

`MockElementBase.type`
