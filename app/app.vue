<script setup lang="ts">
// Force le mode dark sur l'élément <html>
useHead({
  htmlAttrs: { class: 'dark' },
})
</script>

<template>
  <NuxtLayout>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </NuxtLayout>
</template>
