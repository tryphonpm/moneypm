<script setup lang="ts">
import type { Transaction } from '~/types/transaction'

const props = defineProps<{
  transactions: Transaction[]
  loading?: boolean
}>()

const emit = defineEmits<{
  edit:   [tx: Transaction]
  update: [tx: Transaction]
}>()

// ── Sélection ──────────────────────────────────────────────
const selected = ref<Set<string>>(new Set())

const allSelected = computed(
  () => props.transactions.length > 0 && selected.value.size === props.transactions.length
)
const someSelected = computed(
  () => selected.value.size > 0 && selected.value.size < props.transactions.length
)

function toggleAll() {
  if (allSelected.value) {
    selected.value = new Set()
  } else {
    selected.value = new Set(props.transactions.map((t) => t._id))
  }
}
function toggleRow(id: string) {
  const next = new Set(selected.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selected.value = next
}

// ── Tri ────────────────────────────────────────────────────
type SortKey = 'date' | 'type' | 'beneficiaire' | 'montant'
const sortKey = ref<SortKey>('date')
const sortDir = ref<'asc' | 'desc'>('desc')

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = key === 'date' ? 'desc' : 'asc'
  }
}

const sorted = computed(() => {
  return [...props.transactions].sort((a, b) => {
    let cmp = 0
    switch (sortKey.value) {
      case 'date':
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime(); break
      case 'type':
        cmp = a.type.localeCompare(b.type); break
      case 'beneficiaire':
        cmp = a.beneficiaire.localeCompare(b.beneficiaire); break
      case 'montant':
        cmp = a.montant - b.montant; break
    }
    return sortDir.value === 'asc' ? cmp : -cmp
  })
})

// ── Helpers ────────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtAmount(v: number) {
  return Math.abs(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function sortIcon(key: SortKey) {
  if (sortKey.value !== key) return '↕'
  return sortDir.value === 'asc' ? '↑' : '↓'
}

// ── Export CSV ─────────────────────────────────────────────
function exportCSV() {
  const rows = sorted.value.filter((t) => selected.value.size === 0 || selected.value.has(t._id))
  const header = ['Date', 'Type', 'Bénéficiaire', 'Retrait', 'Dépôt', 'Catégories', 'Étiquettes', 'Mémo']
  const lines = rows.map((t) => [
    fmtDate(t.date),
    t.type,
    `"${t.beneficiaire.replace(/"/g, '""')}"`,
    t.montant < 0 ? fmtAmount(t.montant) : '',
    t.montant >= 0 ? fmtAmount(t.montant) : '',
    `"${t.categories.join(', ')}"`,
    `"${t.etiquettes.join(', ')}"`,
    `"${t.memo.replace(/"/g, '""')}"`,
  ].join(';'))
  const csv = [header.join(';'), ...lines].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

defineExpose({ exportCSV, selectedCount: computed(() => selected.value.size) })
</script>

<template>
  <div class="space-y-2">
    <!-- Barre d'actions -->
    <div class="flex items-center justify-between px-1">
      <p class="text-sm text-gray-500">
        <span class="font-medium text-gray-900">{{ transactions.length }}</span> écriture{{ transactions.length > 1 ? 's' : '' }}
        <template v-if="selected.size > 0"> · <span class="text-primary-600 font-medium">{{ selected.size }} sélectionnée{{ selected.size > 1 ? 's' : '' }}</span></template>
      </p>
      <button class="btn-secondary btn-sm" @click="exportCSV">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3" />
        </svg>
        Exporter CSV
      </button>
    </div>

    <!-- Tableau -->
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <!-- Checkbox tout sélectionner -->
            <th class="w-10 px-3">
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate="someSelected"
                @change="toggleAll"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </th>
            <th class="sortable w-28" @click="toggleSort('date')">
              Date <span class="text-gray-400 ml-1">{{ sortIcon('date') }}</span>
            </th>
            <th class="sortable w-36" @click="toggleSort('type')">
              Type <span class="text-gray-400 ml-1">{{ sortIcon('type') }}</span>
            </th>
            <th class="sortable" @click="toggleSort('beneficiaire')">
              Bénéficiaire <span class="text-gray-400 ml-1">{{ sortIcon('beneficiaire') }}</span>
            </th>
            <th class="sortable text-right w-28" @click="toggleSort('montant')">
              Retrait <span class="text-gray-400 ml-1">{{ sortIcon('montant') }}</span>
            </th>
            <th class="text-right w-28">Dépôt</th>
            <th class="w-40">Catégories</th>
            <th class="w-40">Étiquettes</th>
            <th>Mémo</th>
            <th class="w-10"></th>
          </tr>
        </thead>

        <tbody>
          <!-- Skeleton loading -->
          <template v-if="loading">
            <tr v-for="i in 8" :key="i">
              <td colspan="10" class="py-3">
                <div class="h-4 bg-gray-100 rounded animate-pulse mx-3" />
              </td>
            </tr>
          </template>

          <!-- Vide -->
          <tr v-else-if="sorted.length === 0">
            <td colspan="10" class="py-12 text-center text-gray-400 text-sm">
              Aucune écriture à afficher
            </td>
          </tr>

          <!-- Lignes -->
          <tr
            v-for="tx in sorted"
            :key="tx._id"
            :class="{ selected: selected.has(tx._id) }"
          >
            <!-- Checkbox -->
            <td class="w-10 px-3">
              <input
                type="checkbox"
                :checked="selected.has(tx._id)"
                @change="toggleRow(tx._id)"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </td>

            <!-- Date -->
            <td class="text-gray-600 text-xs font-mono">{{ fmtDate(tx.date) }}</td>

            <!-- Type -->
            <td>
              <span class="badge bg-gray-100 text-gray-600 text-xs">{{ tx.type }}</span>
            </td>

            <!-- Bénéficiaire -->
            <td class="max-w-[240px] truncate" :title="tx.beneficiaire">
              {{ tx.beneficiaire || '—' }}
            </td>

            <!-- Retrait -->
            <td class="text-right">
              <span v-if="tx.montant < 0" class="amount-debit">
                {{ fmtAmount(tx.montant) }} €
              </span>
            </td>

            <!-- Dépôt -->
            <td class="text-right">
              <span v-if="tx.montant >= 0" class="amount-credit">
                {{ fmtAmount(tx.montant) }} €
              </span>
            </td>

            <!-- Catégories -->
            <td>
              <div class="flex flex-wrap gap-1">
                <AppBadge v-for="c in tx.categories" :key="c" :label="c" color="blue" />
              </div>
            </td>

            <!-- Étiquettes -->
            <td>
              <div class="flex flex-wrap gap-1">
                <AppBadge v-for="e in tx.etiquettes" :key="e" :label="e" color="purple" />
              </div>
            </td>

            <!-- Mémo -->
            <td class="max-w-[200px] truncate text-gray-500 text-xs" :title="tx.memo">
              {{ tx.memo || '' }}
            </td>

            <!-- Bouton édition -->
            <td class="text-center">
              <button
                class="btn-icon"
                title="Éditer"
                @click="emit('edit', tx)"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5
                       m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
