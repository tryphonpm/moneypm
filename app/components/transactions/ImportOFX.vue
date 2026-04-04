<script setup lang="ts">
const emit = defineEmits<{ imported: [] }>()

const fileInput = ref<HTMLInputElement>()
const dragging  = ref(false)
const loading   = ref(false)
const result    = ref<{ inserted: number; duplicates: number; total: number } | null>(null)
const error     = ref('')

function openPicker() {
  fileInput.value?.click()
}

defineExpose({ openPicker })

function onDragover(e: DragEvent) {
  e.preventDefault()
  dragging.value = true
}
function onDragleave() {
  dragging.value = false
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  dragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) uploadFile(file)
}
function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) uploadFile(file)
}

async function uploadFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.ofx')) {
    error.value = 'Le fichier doit être au format .ofx'
    return
  }
  loading.value = true
  error.value   = ''
  result.value  = null

  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await $fetch<{ inserted: number; duplicates: number; total: number }>(
      '/api/import/ofx',
      { method: 'POST', body: fd }
    )
    result.value = res
    emit('imported')
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string }; message?: string })?.data?.message
      || (e as Error).message
      || 'Erreur import'
  } finally {
    loading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="space-y-3">
    <!-- Zone de dépôt -->
    <div
      :class="[
        'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-colors',
        dragging
          ? 'border-primary-400 bg-primary-50'
          : 'border-gray-300 bg-white hover:border-primary-300 hover:bg-gray-50',
      ]"
      @click="openPicker"
      @dragover="onDragover"
      @dragleave="onDragleave"
      @drop="onDrop"
    >
      <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
      <p class="text-sm text-gray-600">
        <span class="font-medium text-primary-600">Choisir un fichier OFX</span> ou glisser-déposer
      </p>
      <input
        ref="fileInput"
        type="file"
        accept=".ofx"
        class="hidden"
        @change="onFileChange"
      />
    </div>

    <!-- Spinner -->
    <div v-if="loading" class="flex items-center gap-2 text-sm text-gray-500">
      <svg class="w-4 h-4 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
      Import en cours…
    </div>

    <!-- Résultat -->
    <div v-if="result" class="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
      <span class="font-semibold">{{ result.inserted }}</span> écriture{{ result.inserted > 1 ? 's' : '' }} importée{{ result.inserted > 1 ? 's' : '' }}
      <template v-if="result.duplicates > 0">
        · <span class="text-gray-500">{{ result.duplicates }} doublon{{ result.duplicates > 1 ? 's' : '' }} ignoré{{ result.duplicates > 1 ? 's' : '' }}</span>
      </template>
    </div>

    <!-- Erreur -->
    <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </div>
  </div>
</template>
