<script setup lang="ts">
defineProps<{
  title?: string
}>()

const emit = defineEmits<{ close: [] }>()

function onOverlayClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}
</script>

<template>
  <div class="modal-overlay" @click="onOverlayClick">
    <div class="modal-panel" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2 class="text-base font-semibold text-gray-900">{{ title }}</h2>
        <button class="btn-icon" @click="emit('close')" aria-label="Fermer">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <slot />
    </div>
  </div>
</template>
