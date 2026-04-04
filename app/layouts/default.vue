<script setup lang="ts">
const route = useRoute()
const isComptePage = computed(() => route.path.startsWith('/comptes/'))
</script>

<template>
  <div class="min-h-screen bg-gray-950">
    <header class="bg-gray-900 border-b border-gray-800 shadow-lg">
      <div class="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <svg class="w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096
                 V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25
                 M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75
                 c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75
                 m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75
                 M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
          <span class="text-lg font-bold text-gray-100 tracking-tight">MoneyPM</span>
        </div>

        <NuxtLink v-if="isComptePage" to="/" class="btn-secondary btn-sm">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Mes comptes
        </NuxtLink>
      </div>
    </header>

    <main class="max-w-screen-2xl mx-auto px-6 py-6">
      <slot />
    </main>
  </div>
</template>
