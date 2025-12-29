---
editUrl: false
next: false
prev: false
title: "extractNavigationTargets"
---

> **extractNavigationTargets**(`mock`): `string`[]

Defined in: packages/core/src/extractNavigationTargets.ts:26

Extracts all navigation targets from a mock definition.
Collects all `navigateTo`, `itemNavigateTo`, and `rowNavigateTo` values
from mock elements to determine screen navigation targets.

## Parameters

### mock

[`ScreenMock`](/screenbook/api/interfaces/screenmock/)

The screen mock definition

## Returns

`string`[]

Array of unique screen IDs that this screen can navigate to

## Example

```ts
const targets = extractNavigationTargets({
  sections: [
    {
      elements: [
        { type: "button", label: "Edit", navigateTo: "billing.edit" },
        { type: "link", label: "Back", navigateTo: "billing.list" },
      ],
    },
  ],
})
// => ["billing.edit", "billing.list"]
```
