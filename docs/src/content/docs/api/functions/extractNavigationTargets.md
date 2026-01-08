---
editUrl: false
next: false
prev: false
title: "extractNavigationTargets"
---

> **extractNavigationTargets**(`mock`): `string`[]

Defined in: [packages/core/src/extractNavigationTargets.ts:27](https://github.com/wadakatu/screenbook/blob/6005b6bc35a5bb21b6a450ee7633658b30cb36bf/packages/core/src/extractNavigationTargets.ts#L27)

Extracts all navigation target screen IDs from a mock definition.

This function collects all `navigateTo`, `itemNavigateTo`, and `rowNavigateTo`
values from mock elements to automatically derive the `next` array.
It recursively processes child sections.

## Parameters

### mock

[`ScreenMock`](/screenbook/api/interfaces/screenmock/)

The screen mock definition

## Returns

`string`[]

Array of unique screen IDs that can be navigated to

## Example

```ts
const mock = {
  sections: [{
    elements: [
      { type: "button", label: "Edit", navigateTo: "billing.invoice.edit" },
      { type: "list", label: "Items", itemNavigateTo: "billing.item.detail" },
    ]
  }]
}
extractNavigationTargets(mock)
// => ["billing.invoice.edit", "billing.item.detail"]
```
