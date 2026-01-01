<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div>
    <nav>
      <RouterLink to="/">Home</RouterLink> |
      <RouterLink to="/dashboard">Dashboard</RouterLink> |
      <RouterLink to="/settings">Settings</RouterLink> |
      <RouterLink to="/user/1/profile">User Profile</RouterLink>
    </nav>
    <main>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
nav {
  padding: 1rem;
  background: #f0f0f0;
}
nav a {
  margin: 0 0.5rem;
}
main {
  padding: 1rem;
}
</style>
