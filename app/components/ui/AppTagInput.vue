<script setup lang="ts">
/**
 * Champ de saisie de tags (catégories / étiquettes).
 * Valide avec Entrée ou virgule, supprime avec Backspace ou ×.
 */
const model = defineModel<string[]>({ default: () => [] })

const input = ref('')

function add() {
  const val = input.value.trim().replace(/,/g, '')
  if (val && !model.value.includes(val)) {
    model.value = [...model.value, val]
  }
  input.value = ''
}

function remove(tag: string) {
  model.value = model.value.filter((t) => t !== tag)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    add()
  }
  if (e.key === 'Backspace' && input.value === '' && model.value.length) {
    model.value = model.value.slice(0, -1)
  }
}
</script>

<template>
  <div
    class="flex flex-wrap gap-1.5 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5
           focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200 transition-colors min-h-[38px]"
  >
    <span
      v-for="tag in model"
      :key="tag"
      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium"
    >
      {{ tag }}
      <button type="button" @click="remove(tag)" class="hover:text-primary-900 leading-none">&times;</button>
    </span>
    <input
      v-model="input"
      class="flex-1 min-w-[120px] text-sm bg-transparent outline-none placeholder-gray-400"
      placeholder="Ajouter (Entrée)…"
      @keydown="onKeydown"
      @blur="add"
    />
  </div>
</template>
