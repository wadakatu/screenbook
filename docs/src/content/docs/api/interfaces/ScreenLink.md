---
editUrl: false
next: false
prev: false
title: "ScreenLink"
---

Defined in: [packages/core/src/types.ts:11](https://github.com/wadakatu/screenbook/blob/ef23c0f12ae1a1d049097d28de425394d6bc08ee/packages/core/src/types.ts#L11)

External link to related resources

## Properties

### label

> **label**: `string`

Defined in: [packages/core/src/types.ts:17](https://github.com/wadakatu/screenbook/blob/ef23c0f12ae1a1d049097d28de425394d6bc08ee/packages/core/src/types.ts#L17)

Display label for the link

#### Examples

```ts
"Figma Design"
```

```ts
"Storybook"
```

***

### type?

> `optional` **type**: [`ScreenLinkType`](/screenbook/api/type-aliases/screenlinktype/)

Defined in: [packages/core/src/types.ts:30](https://github.com/wadakatu/screenbook/blob/ef23c0f12ae1a1d049097d28de425394d6bc08ee/packages/core/src/types.ts#L30)

Type of link for icon display
If not specified, the type is inferred from the URL

#### Examples

```ts
"figma"
```

```ts
"storybook"
```

***

### url

> **url**: `string`

Defined in: [packages/core/src/types.ts:23](https://github.com/wadakatu/screenbook/blob/ef23c0f12ae1a1d049097d28de425394d6bc08ee/packages/core/src/types.ts#L23)

URL to the external resource

#### Examples

```ts
"https://figma.com/file/..."
```

```ts
"https://storybook.example.com/?path=/story/billing-invoice"
```
