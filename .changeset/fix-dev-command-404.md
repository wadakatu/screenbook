---
"@screenbook/ui": patch
---

fix: include source files in npm package for dev command to work

The `screenbook dev` command was returning 404 on all routes because the Astro source files (`src/pages`, etc.) were not included in the published npm package. This fix adds `src`, `public`, `astro.config.mjs`, and `tsconfig.json` to the `files` field in package.json.
