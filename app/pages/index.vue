<script setup lang="ts">
import type { Account } from '~/types/account'

useHead({ title: 'Mes comptes — MoneyPM' })

const comptes  = ref<Account[]>([])
const loading  = ref(false)
const showForm = ref(false)
const saving   = ref(false)
const error    = ref('')
const form     = reactive({ BANQUE: '', numero_compte: '' })

async function loadComptes() {
  loading.value = true
  try {
    comptes.value = await $fetch<Account[]>('/api/comptes')
  } finally {
    loading.value = false
  }
}

async function createCompte() {
  if (!form.BANQUE.trim() || !form.numero_compte.trim()) return
  saving.value = true
  error.value  = ''
  try {
    const created = await $fetch<Account>('/api/comptes', {
      method: 'POST',
      body: { BANQUE: form.BANQUE, numero_compte: form.numero_compte },
    })
    comptes.value.push(created)
    form.BANQUE = ''
    form.numero_compte = ''
    showForm.value = false
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message || 'Erreur lors de la création'
  } finally {
    saving.value = false
  }
}

onMounted(loadComptes)
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-8">
    <!-- En-tête -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-100">Mes comptes</h1>
        <p class="text-sm text-gray-500 mt-0.5">Sélectionnez un compte pour accéder à ses écritures</p>
      </div>
      <button class="btn-primary" @click="showForm = !showForm">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Nouveau compte
      </button>
    </div>

    <!-- Formulaire création -->
    <div v-if="showForm" class="card p-5 space-y-4">
      <h2 class="text-sm font-semibold text-gray-300">Ajouter un compte</h2>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="form-label">Banque</label>
          <input v-model="form.BANQUE" type="text" class="form-input" placeholder="ex : BNP Paribas" @keyup.enter="createCompte" />
        </div>
        <div>
          <label class="form-label">Numéro de compte</label>
          <input v-model="form.numero_compte" type="text" class="form-input" placeholder="ex : 025194F" @keyup.enter="createCompte" />
        </div>
      </div>
      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
      <div class="flex gap-2 justify-end">
        <button class="btn-secondary" @click="showForm = false; error = ''">Annuler</button>
        <button
          class="btn-primary"
          :disabled="saving || !form.BANQUE.trim() || !form.numero_compte.trim()"
          @click="createCompte"
        >
          <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          {{ saving ? 'Création…' : 'Créer le compte' }}
        </button>
      </div>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="card p-5 animate-pulse">
        <div class="h-4 bg-gray-700 rounded w-1/3 mb-2" />
        <div class="h-3 bg-gray-700 rounded w-1/4" />
      </div>
    </div>

    <!-- Vide -->
    <div v-else-if="comptes.length === 0" class="card p-10 text-center">
      <svg class="w-10 h-10 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75
             M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25
             M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75
             c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75
             m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
      </svg>
      <p class="text-gray-500 text-sm">Aucun compte enregistré</p>
      <button class="btn-primary mt-4" @click="showForm = true">Créer un premier compte</button>
    </div>

    <!-- Liste -->
    <div v-else class="space-y-3">
      <NuxtLink
        v-for="compte in comptes"
        :key="compte._id"
        :to="`/comptes/${compte._id}`"
        class="card p-5 flex items-center justify-between hover:border-primary-700 hover:shadow-primary-900/20 hover:shadow-lg transition-all group block"
      >
        <div>
          <p class="font-semibold text-gray-100 group-hover:text-primary-300 transition-colors">
            {{ compte.BANQUE }}
          </p>
          <p class="text-sm text-gray-500 font-mono mt-0.5">{{ compte.numero_compte }}</p>
        </div>
        <svg class="w-5 h-5 text-gray-600 group-hover:text-primary-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </NuxtLink>
    </div>
  </div>
</template>
