<script setup lang="ts">
const props = defineProps<{
  total:        number
  page:         number
  limit:        number
  limitOptions?: number[]
}>()

const emit = defineEmits<{
  'update:page':  [page: number]
  'update:limit': [limit: number]
}>()

const options = props.limitOptions ?? [25, 50, 75, 100]

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.limit)))

const pages = computed(() => {
  const p = props.page
  const last = totalPages.value
  const set = new Set([1, last, p - 1, p, p + 1].filter((n) => n >= 1 && n <= last))
  const sorted = [...set].sort((a, b) => a - b)

  // Insérer des séparateurs (null) pour les trous
  const result: (number | null)[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push(null)
    result.push(sorted[i])
  }
  return result
})

const from = computed(() => Math.min((props.page - 1) * props.limit + 1, props.total))
const to   = computed(() => Math.min(props.page * props.limit, props.total))
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-4 px-1 pt-2">
    <!-- Info + sélecteur de taille -->
    <div class="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
      <span>{{ from }}–{{ to }} sur {{ total }}</span>
      <div class="flex items-center gap-1.5">
        <span class="text-xs">par page</span>
        <div class="relative">
          <select
            :value="limit"
            class="form-select py-1 pl-2 pr-6 text-xs w-20"
            @change="emit('update:limit', parseInt(($event.target as HTMLSelectElement).value)); emit('update:page', 1)"
          >
            <option v-for="o in options" :key="o" :value="o">{{ o }}</option>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-1.5 flex items-center">
            <svg class="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Boutons de pages -->
    <div class="flex items-center gap-1">
      <!-- Précédent -->
      <button
        class="pagination-btn"
        :disabled="page <= 1"
        @click="emit('update:page', page - 1)"
        aria-label="Page précédente"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      <template v-for="(p, i) in pages" :key="i">
        <!-- Séparateur -->
        <span v-if="p === null" class="px-1 text-gray-400 dark:text-gray-600 text-sm select-none">…</span>
        <!-- Page -->
        <button
          v-else
          :class="['pagination-btn', { active: p === page }]"
          @click="emit('update:page', p)"
        >
          {{ p }}
        </button>
      </template>

      <!-- Suivant -->
      <button
        class="pagination-btn"
        :disabled="page >= totalPages"
        @click="emit('update:page', page + 1)"
        aria-label="Page suivante"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  </div>
</template>
