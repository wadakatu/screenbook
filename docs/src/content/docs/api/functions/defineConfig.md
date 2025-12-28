---
editUrl: false
next: false
prev: false
title: "defineConfig"
---

> **defineConfig**(`input`): `object`

Defined in: [packages/core/src/defineScreen.ts:43](https://github.com/wadakatu/screenbook/blob/7ee23424a5c0768602877d6e3e06c2e39abbaf4f/packages/core/src/defineScreen.ts#L43)

Define Screenbook configuration.

## Parameters

### input

#### adoption?

\{ `includePatterns?`: `string`[]; `minimumCoverage?`: `number`; `mode?`: `"full"` \| `"progressive"`; \} = `...`

Progressive adoption configuration for gradual rollout

#### adoption.includePatterns?

`string`[] = `...`

Glob patterns to include for coverage checking (progressive mode only)

**Examples**

```ts
["src/pages/billing/**"] - Only check billing module
```

```ts
["src/pages/auth/**", "src/pages/settings/**"] - Check multiple modules
```

#### adoption.minimumCoverage?

`number` = `...`

Minimum coverage percentage required to pass lint

**Example**

```ts
80 - Fail if coverage is below 80%
```

#### adoption.mode?

`"full"` \| `"progressive"` = `...`

Adoption mode
- "full": All routes must have screen.meta.ts (default)
- "progressive": Only check coverage within includePatterns

#### ignore?

`string`[] = `...`

Patterns to ignore when scanning (glob patterns)

#### metaPattern?

`string` = `...`

Glob pattern for screen metadata files
Supports colocation: place screen.meta.ts alongside your route files

**Examples**

```ts
"src/**/screen.meta.ts" - scan entire src directory
```

```ts
"app/**/screen.meta.ts" - for Next.js App Router
```

#### outDir?

`string` = `...`

Output directory for generated files

#### routesPattern?

`string` = `...`

Glob pattern for route files (for generate/lint commands)

**Examples**

```ts
"src/pages/**/page.tsx" - Vite/React
```

```ts
"app/**/page.tsx" - Next.js App Router
```

```ts
"src/routes/**/*.tsx" - React Router
```

## Returns

### adoption?

> `optional` **adoption**: `object`

Progressive adoption configuration for gradual rollout

#### adoption.includePatterns?

> `optional` **includePatterns**: `string`[]

Glob patterns to include for coverage checking (progressive mode only)

##### Examples

```ts
["src/pages/billing/**"] - Only check billing module
```

```ts
["src/pages/auth/**", "src/pages/settings/**"] - Check multiple modules
```

#### adoption.minimumCoverage?

> `optional` **minimumCoverage**: `number`

Minimum coverage percentage required to pass lint

##### Example

```ts
80 - Fail if coverage is below 80%
```

#### adoption.mode

> **mode**: `"full"` \| `"progressive"`

Adoption mode
- "full": All routes must have screen.meta.ts (default)
- "progressive": Only check coverage within includePatterns

### ignore

> **ignore**: `string`[]

Patterns to ignore when scanning (glob patterns)

### metaPattern

> **metaPattern**: `string`

Glob pattern for screen metadata files
Supports colocation: place screen.meta.ts alongside your route files

#### Examples

```ts
"src/**/screen.meta.ts" - scan entire src directory
```

```ts
"app/**/screen.meta.ts" - for Next.js App Router
```

### outDir

> **outDir**: `string`

Output directory for generated files

### routesPattern?

> `optional` **routesPattern**: `string`

Glob pattern for route files (for generate/lint commands)

#### Examples

```ts
"src/pages/**/page.tsx" - Vite/React
```

```ts
"app/**/page.tsx" - Next.js App Router
```

```ts
"src/routes/**/*.tsx" - React Router
```

## Example

```ts
export default defineConfig({
  screensDir: "src/screens",
  outDir: ".screenbook",
  metaPattern: "**/screen.meta.ts",
})
```
