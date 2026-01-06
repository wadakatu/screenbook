<script setup lang="ts">
// This is a reusable component, NOT a screen
// screen.meta.ts should NOT be generated here (issue #170)
defineProps<{
	title: string
	description: string
}>()
</script>

<template>
  <div class="project-card">
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
  </div>
</template>

<style scoped>
.project-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  margin: 8px 0;
}
</style>
