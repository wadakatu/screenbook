---
"@screenbook/cli": patch
"@screenbook/ui": patch
"screenbook": patch
---

fix: resolve workspace:* protocol in published packages

Previously, packages were published with `workspace:*` protocol instead of actual version numbers, causing installation failures in pnpm workspaces. This release fixes the issue by using `pnpm publish` which automatically converts workspace protocols.
