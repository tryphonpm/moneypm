<script setup lang="ts">
import type { Transaction } from '~/types/transaction'
import type { Account } from '~/types/account'

const route    = useRoute()
const compteId = route.params.id as string

// ── Compte ─────────────────────────────────────────────────
const compte      = ref<Account | null>(null)
const compteError = ref(false)

async function loadCompte() {
  try {
    const list = await $fetch<Account[]>('/api/comptes')
    compte.value = list.find((c) => c._id === compteId) ?? null
    if (!compte.value) compteError.value = true
  } catch {
    compteError.value = true
  }
}

useHead(computed(() => ({
  title: compte.value
    ? `${compte.value.BANQUE} · ${compte.value.numero_compte} — MoneyPM`
    : 'Écritures — MoneyPM',
})))

// ── Transactions ───────────────────────────────────────────
const transactions = ref<Transaction[]>([])
const total        = ref(0)
const loading      = ref(false)
const showImport   = ref(false)
const editingTx    = ref<Transaction | null>(null)

// ── Pagination ─────────────────────────────────────────────
const page  = ref(1)
const limit = ref(25)

// ── Filtres ────────────────────────────────────────────────
const filterType     = ref('')
const filterDateFrom = ref('')
const filterDateTo   = ref('')

const TYPES = [
  '', 'ATM', 'Carte', 'Check', 'Credit', 'Debit',
  'Prélèvement', 'Remise chèque(s)', 'Retrait DAB',
  'Service Charge', 'Transfer', 'Virement',
]

async function loadTransactions() {
  loading.value = true
  try {
    const params: Record<string, string | number> = {
      compteId,
      page:  page.value,
      limit: limit.value,
    }
    if (filterType.value)     params.type     = filterType.value
    if (filterDateFrom.value) params.dateFrom  = filterDateFrom.value
    if (filterDateTo.value)   params.dateTo    = filterDateTo.value

    const res = await $fetch<{ transactions: Transaction[]; total: number }>(
      '/api/transactions',
      { query: params }
    )
    transactions.value = res.transactions
    total.value        = res.total
  } finally {
    loading.value = false
  }
}

function onPageChange(p: number) {
  page.value = p
  loadTransactions()
}
function onLimitChange(l: number) {
  limit.value = l
  page.value  = 1
  loadTransactions()
}
function applyFilters() {
  page.value = 1
  loadTransactions()
}
function resetFilters() {
  filterType.value     = ''
  filterDateFrom.value = ''
  filterDateTo.value   = ''
  page.value           = 1
  loadTransactions()
}

onMounted(() => {
  loadCompte()
  loadTransactions()
})

// ── Résumé (sur la page courante) ──────────────────────────
const summary = computed(() => {
  const depots   = transactions.value.filter((t) => t.montant >= 0).reduce((s, t) => s + t.montant, 0)
  const retraits = transactions.value.filter((t) => t.montant < 0).reduce((s, t) => s + t.montant, 0)
  return { depots, retraits, solde: depots + retraits }
})

function fmt(v: number) {
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Backup ─────────────────────────────────────────────────
const backing     = ref(false)
const backupToast = ref('')

async function createBackup() {
  backing.value     = true
  backupToast.value = ''
  try {
    const res = await $fetch<{ folder: string; collections: Record<string, number> }>(
      '/api/backup',
      { method: 'POST' }
    )
    const stats = Object.entries(res.collections)
      .map(([k, v]) => `${v} ${k}`)
      .join(', ')
    backupToast.value = `✔ Backup créé — ${res.folder} (${stats})`
    setTimeout(() => { backupToast.value = '' }, 5000)
  } catch (e: unknown) {
    backupToast.value = `✖ ${(e as { data?: { message?: string } })?.data?.message || 'Erreur backup'}`
    setTimeout(() => { backupToast.value = '' }, 5000)
  } finally {
    backing.value = false
  }
}

// ── Import ─────────────────────────────────────────────────
function onImported() {
  showImport.value = false
  page.value = 1
  loadTransactions()
}

// ── Édition ────────────────────────────────────────────────
function onSaved(updated: Transaction) {
  const idx = transactions.value.findIndex((t) => t._id === updated._id)
  if (idx !== -1) transactions.value[idx] = updated
}
</script>

<template>
  <div v-if="compteError" class="text-center py-20 text-gray-500">
    Compte introuvable.
    <NuxtLink to="/" class="text-primary-400 underline ml-1">Retour à l'accueil</NuxtLink>
  </div>

  <div v-else class="space-y-6">
    <!-- En-tête -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-100">{{ compte ? compte.BANQUE : '…' }}</h1>
        <p class="text-sm text-gray-500 font-mono mt-0.5">{{ compte ? compte.numero_compte : '' }}</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Backup -->
        <button class="btn-secondary" :disabled="backing" @click="createBackup">
          <svg v-if="backing" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5
                 M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-.375c0-.621-.504-1.125-1.125-1.125H3.375
                 c-.621 0-1.125.504-1.125 1.125v.375c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          {{ backing ? 'Sauvegarde…' : 'Créer un backup' }}
        </button>

        <!-- Import OFX -->
        <button class="btn-primary" @click="showImport = true">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5
                 M16.5 12L12 16.5m0 0L7.5 12M12 16.5V3" />
          </svg>
          Importer OFX
        </button>
      </div>
    </div>

    <!-- Toast backup -->
    <Transition enter-from-class="opacity-0 -translate-y-2" leave-to-class="opacity-0 -translate-y-2" enter-active-class="transition duration-200" leave-active-class="transition duration-200">
      <div
        v-if="backupToast"
        :class="[
          'rounded-lg px-4 py-3 text-sm font-medium',
          backupToast.startsWith('✔')
            ? 'bg-emerald-900/40 border border-emerald-700 text-emerald-300'
            : 'bg-red-900/40 border border-red-700 text-red-300'
        ]"
      >
        {{ backupToast }}
      </div>
    </Transition>

    <!-- Modale import -->
    <AppModal v-if="showImport" title="Importer un fichier OFX" @close="showImport = false">
      <div class="modal-body">
        <ImportOFX :compte-id="compteId" @imported="onImported" />
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
              <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
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
          <button class="btn-primary" @click="applyFilters">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            Filtrer
          </button>
          <button class="btn-secondary" @click="resetFilters">Réinitialiser</button>
        </div>
      </div>
    </div>

    <!-- Tableau -->
    <TransactionTable
      :transactions="transactions"
      :loading="loading"
      :total="total"
      :page="page"
      :limit="limit"
      @edit="(tx) => (editingTx = tx)"
      @update:page="onPageChange"
      @update:limit="onLimitChange"
    />

    <!-- Modal édition -->
    <TransactionEditModal
      v-if="editingTx"
      :transaction="editingTx"
      @close="editingTx = null"
      @saved="onSaved"
    />
  </div>
</template>
