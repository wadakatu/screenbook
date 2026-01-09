<script setup lang="ts">
// Issue #201: Page with component in subdirectory
// The route should be extracted from Vue Router config as "/admin"
// NOT inferred from directory name as "/PageAdmin"
</script>

<template>
  <div class="admin-page">
    <h1>Admin Page</h1>
    <p>This page tests Issue #201 fix.</p>
  </div>
</template>
