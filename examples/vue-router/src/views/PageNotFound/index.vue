<template>
	<div class="not-found">
		<h1>404 - Page Not Found</h1>
		<p>The page you are looking for does not exist.</p>
		<router-link to="/">Go Home</router-link>
	</div>
</template>

<script setup lang="ts">
// Issue #202: Test component for catch-all route
</script>

<style scoped>
.not-found {
	text-align: center;
	padding: 2rem;
}
</style>
