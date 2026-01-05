---
"@screenbook/cli": minor
---

feat(generate): resolve component identifiers from imports in Vue Router

The Vue Router parser now tracks import statements and resolves component identifiers to their file paths. This enables correct `componentPath` extraction for routes that use imported components like:

```ts
import PageProjects from './pages/PageProjects/PageProjects.vue'

export const routes = [
  { path: '/projects', component: PageProjects }  // componentPath is now resolved!
]
```

Also fixed empty path routes (`path: ""`) being incorrectly skipped. Empty paths are valid in Vue Router and represent routes that match the parent path.

This fix ensures that when using `routesFile` configuration, the generated `screen.meta.ts` files have correct route values from the actual router configuration.
