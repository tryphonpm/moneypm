<script setup lang="ts">
import type { Transaction } from '~/types/transaction'

useHead({ title: 'Écritures — MoneyPM' })

// ── État ───────────────────────────────────────────────────
const transactions = ref<Transaction[]>([])
const loading      = ref(false)
const showImport   = ref(false)
const editingTx    = ref<Transaction | null>(null)

// ── Filtres ────────────────────────────────────────────────
const filterType     = ref('')
const filterDateFrom = ref('')
const filterDateTo   = ref('')

const TYPES = [
  '', 'ATM', 'Carte', 'Check', 'Credit', 'Debit',
  'Prélèvement', 'Remise chèque(s)', 'Retrait DAB',
  'Service Charge', 'Transfer', 'Virement',
]

// ── Chargement ─────────────────────────────────────────────
async function loadTransactions() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (filterType.value)     params.type     = filterType.value
    if (filterDateFrom.value) params.dateFrom  = filterDateFrom.value
    if (filterDateTo.value)   params.dateTo    = filterDateTo.value

    const res = await $fetch<{ transactions: Transaction[] }>('/api/transactions', {
      query: params,
    })
    transactions.value = res.transactions
  } finally {
    loading.value = false
  }
}

onMounted(loadTransactions)

// ── Résumé ─────────────────────────────────────────────────
const summary = computed(() => {
  const depots   = transactions.value.filter((t) => t.montant >= 0).reduce((s, t) => s + t.montant, 0)
  const retraits = transactions.value.filter((t) => t.montant < 0).reduce((s, t) => s + t.montant, 0)
  return { depots, retraits, solde: depots + retraits }
})

function fmt(v: number) {
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Import ─────────────────────────────────────────────────
function onImported() {
  showImport.value = false
  loadTransactions()
}

// ── Édition ────────────────────────────────────────────────
function onSaved(updated: Transaction) {
  const idx = transactions.value.findIndex((t) => t._id === updated._id)
  if (idx !== -1) transactions.value[idx] = updated
}
</script>

<template>
  <div class="space-y-6">
    <!-- En-tête page -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Écritures bancaires</h1>
        <p class="text-sm text-gray-500 mt-0.5">Gestion et suivi des opérations du compte</p>
      </div>
      <button class="btn-primary" @click="showImport = true">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5
               M16.5 12L12 16.5m0 0L7.5 12M12 16.5V3" />
        </svg>
        Importer OFX
      </button>
    </div>

    <!-- Modale import -->
    <AppModal v-if="showImport" title="Importer un fichier OFX" @close="showImport = false">
      <div class="modal-body">
        <ImportOFX @imported="onImported" />
      </div>
    </AppModal>

    <!-- Cartes résumé -->
    <div class="grid grid-cols-3 gap-4">
      <div class="card p-4">
        <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Dépôts</p>
        <p class="text-xl font-bold amount-credit mt-1">+ {{ fmt(summary.depots) }} €</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Retraits</p>
        <p class="text-xl font-bold amount-debit mt-1">{{ fmt(summary.retraits) }} €</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Solde net</p>
        <p :class="['text-xl font-bold mt-1', summary.solde >= 0 ? 'amount-credit' : 'amount-debit']">
          {{ summary.solde >= 0 ? '+' : '' }}{{ fmt(summary.solde) }} €
        </p>
      </div>
    </div>

    <!-- Filtres -->
    <div class="card p-4">
      <div class="flex flex-wrap gap-4 items-end">
        <div class="flex-1 min-w-[180px]">
          <label class="form-label">Type</label>
          <div class="relative">
            <select v-model="filterType" class="form-select">
              <option value="">Tous les types</option>
              <option v-for="t in TYPES.slice(1)" :key="t" :value="t">{{ t }}</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-2 flex items-center">
              <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div class="flex-1 min-w-[160px]">
          <label class="form-label">Du</label>
          <input v-model="filterDateFrom" type="date" class="form-input" />
        </div>

        <div class="flex-1 min-w-[160px]">
          <label class="form-label">Au</label>
          <input v-model="filterDateTo" type="date" class="form-input" />
        </div>

        <div class="flex gap-2">
          <button class="btn-primary" @click="loadTransactions">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            Filtrer
          </button>
          <button
            class="btn-secondary"
            @click="filterType = ''; filterDateFrom = ''; filterDateTo = ''; loadTransactions()"
          >
            Réinitialiser
          </button>
        </div>
      </div>
    </div>

    <!-- Tableau -->
    <TransactionTable
      :transactions="transactions"
      :loading="loading"
      @edit="(tx) => (editingTx = tx)"
    />

    <!-- Modal d'édition -->
    <TransactionEditModal
      v-if="editingTx"
      :transaction="editingTx"
      @close="editingTx = null"
      @saved="onSaved"
    />
  </div>
</template>
