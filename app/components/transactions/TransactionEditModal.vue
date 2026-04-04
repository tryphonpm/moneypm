<script setup lang="ts">
import type { Transaction } from '~/types/transaction'

const props = defineProps<{ transaction: Transaction }>()
const emit  = defineEmits<{ close: []; saved: [tx: Transaction] }>()

const TYPES = [
  'ATM', 'Carte', 'Check', 'Credit', 'Debit',
  'Prélèvement', 'Remise chèque(s)', 'Retrait DAB',
  'Service Charge', 'Transfer', 'Virement',
] as const

// Copie locale éditable
const form = reactive({
  date:        new Date(props.transaction.date).toISOString().slice(0, 10),
  type:        props.transaction.type,
  beneficiaire:props.transaction.beneficiaire,
  categories:  [...props.transaction.categories],
  etiquettes:  [...props.transaction.etiquettes],
  memo:        props.transaction.memo,
})

const saving = ref(false)
const error  = ref('')

async function save() {
  saving.value = true
  error.value  = ''
  try {
    const updated = await $fetch<Transaction>(`/api/transactions/${props.transaction._id}`, {
      method: 'PUT',
      body: { ...form, date: new Date(form.date) },
    })
    emit('saved', updated)
    emit('close')
  } catch (e: unknown) {
    error.value = (e as Error).message || 'Erreur lors de la sauvegarde'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal title="Éditer l'écriture" @close="emit('close')">
    <div class="modal-body">
      <form class="space-y-4" @submit.prevent="save">

        <!-- Date + Type -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">Date</label>
            <input v-model="form.date" type="date" class="form-input" required />
          </div>
          <div>
            <label class="form-label">Type</label>
            <div class="relative">
              <select v-model="form.type" class="form-select">
                <option v-for="t in TYPES" :key="t" :value="t">{{ t }}</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Bénéficiaire -->
        <div>
          <label class="form-label">Bénéficiaire</label>
          <input v-model="form.beneficiaire" type="text" class="form-input" placeholder="Nom du bénéficiaire" />
        </div>

        <!-- Montant (lecture seule) -->
        <div>
          <label class="form-label">Montant</label>
          <div :class="['form-input bg-gray-50 font-mono font-semibold', transaction.montant >= 0 ? 'text-green-600' : 'text-red-600']">
            {{ transaction.montant >= 0 ? '+' : '' }}{{ transaction.montant.toFixed(2) }} €
          </div>
        </div>

        <!-- Catégories -->
        <div>
          <label class="form-label">Catégories</label>
          <AppTagInput v-model="form.categories" />
        </div>

        <!-- Étiquettes -->
        <div>
          <label class="form-label">Étiquettes</label>
          <AppTagInput v-model="form.etiquettes" />
        </div>

        <!-- Mémo -->
        <div>
          <label class="form-label">Mémo</label>
          <textarea
            v-model="form.memo"
            class="form-input resize-none"
            rows="3"
            placeholder="Notes libres…"
          />
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      </form>
    </div>

    <div class="modal-footer">
      <button type="button" class="btn-secondary" @click="emit('close')">Annuler</button>
      <button type="button" class="btn-primary" :disabled="saving" @click="save">
        <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        {{ saving ? 'Sauvegarde…' : 'Enregistrer' }}
      </button>
    </div>
  </AppModal>
</template>
