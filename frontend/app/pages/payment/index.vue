<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold text-primary mb-6">{{ $t('payment.title') }}</h1>

    <div v-if="loading" class="text-center py-12 text-gray-500">...</div>

    <template v-else>
      <!-- Active entry banner -->
      <div
        v-if="activeEntry"
        :class="[
          'px-6 py-4 rounded-xl mb-6',
          activeEntry.paymentStatus === 'confirmed' ? 'bg-green-50 border border-green-200 text-green-800' :
          activeEntry.paymentStatus === 'reported' ? 'bg-blue-50 border border-blue-200 text-blue-800' :
          'bg-yellow-50 border border-yellow-200 text-yellow-800'
        ]"
      >
        <p class="font-semibold">
          {{ $t('predictions.entryNumber', { n: activeEntry.entryNumber }) }} —
          {{ activeEntry.paymentStatus === 'confirmed' ? $t('payment.statusConfirmed') :
             activeEntry.paymentStatus === 'reported' ? $t('payment.statusReported') :
             $t('payment.statusPending') }}
        </p>
      </div>

      <!-- No active entry -->
      <div v-else-if="entriesStore.canRequestNewEntry" class="card mb-6 text-center">
        <p class="text-gray-700 mb-4">{{ $t('payment.noActiveAfterCompletion') }}</p>
        <button @click="createNewEntry" :disabled="creating" class="btn-primary">
          {{ creating ? $t('predictions.creatingEntry') : $t('predictions.newPrediction') }}
        </button>
      </div>

      <div v-else class="card mb-6 text-center text-gray-600">
        {{ $t('payment.noActiveEntry') }}
      </div>

      <!-- Pricing -->
      <div v-if="config && activeEntry && activeEntry.paymentStatus !== 'confirmed'" class="card mb-6">
        <h2 class="text-lg font-semibold text-primary mb-4">{{ $t('payment.priceLabel') }}</h2>
        <p class="text-4xl font-bold text-accent">
          {{ config.currency }} ${{ config.price }}
        </p>
        <p v-if="config.instructions" class="text-gray-600 mt-3 text-sm whitespace-pre-line">
          {{ config.instructions }}
        </p>
      </div>

      <!-- Payment options -->
      <div
        v-if="config && activeEntry && activeEntry.paymentStatus !== 'confirmed' && config.paymentMethods.length > 0"
        class="mb-6"
      >
        <h2 class="text-lg font-semibold text-primary mb-4">{{ $t('payment.howToPay') }}</h2>
        <div class="space-y-4">
          <div
            v-for="(method, i) in config.paymentMethods"
            :key="i"
            class="card border-l-4 border-accent"
          >
            <h3 class="font-bold text-primary text-base">{{ method.label }}</h3>
            <div class="flex items-center gap-2 mt-1">
              <p class="flex-1 text-gray-800 select-all font-mono bg-gray-50 px-3 py-2 rounded text-sm">
                {{ method.value }}
              </p>
              <button
                @click="copyToClipboard(method.value, `${i}-value`)"
                class="text-gray-400 hover:text-primary transition-colors px-2 py-2 rounded hover:bg-gray-100"
                :title="$t('payment.copy')"
              >
                <span v-if="copiedKey === `${i}-value`" class="text-green-500 text-xs font-medium">{{ $t('payment.copied') }}</span>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
            </div>
            <div v-if="method.details" class="flex items-start gap-2 mt-2">
              <p class="flex-1 text-sm text-gray-600 whitespace-pre-line select-all bg-gray-50 px-3 py-2 rounded">
                {{ method.details }}
              </p>
              <button
                @click="copyToClipboard(method.details, `${i}-details`)"
                class="text-gray-400 hover:text-primary transition-colors px-2 py-2 rounded hover:bg-gray-100 shrink-0"
                :title="$t('payment.copy')"
              >
                <span v-if="copiedKey === `${i}-details`" class="text-green-500 text-xs font-medium">{{ $t('payment.copied') }}</span>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Contact info -->
      <div
        v-if="config && activeEntry && activeEntry.paymentStatus !== 'confirmed' && (config.contactEmail || config.contactPhone)"
        class="card mb-6"
      >
        <h2 class="text-lg font-semibold text-primary mb-4">{{ $t('payment.contactInfo') }}</h2>
        <div class="space-y-2 text-sm">
          <p v-if="config.contactEmail" class="text-gray-600">
            <span class="font-medium text-gray-700">Email:</span> {{ config.contactEmail }}
          </p>
          <p v-if="config.contactPhone" class="text-gray-600">
            <span class="font-medium text-gray-700">Tel:</span> {{ config.contactPhone }}
          </p>
        </div>
      </div>

      <!-- Report payment form -->
      <div v-if="activeEntry && activeEntry.paymentStatus === 'pending'" class="card">
        <h2 class="text-lg font-semibold text-primary mb-4">{{ $t('payment.reportPayment') }}</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('payment.note') }}</label>
            <textarea
              v-model="note"
              class="input-field"
              rows="3"
              :placeholder="$t('payment.notePlaceholder')"
            ></textarea>
          </div>
          <button @click="reportPayment" :disabled="reporting" class="btn-primary">
            {{ reporting ? $t('payment.reporting') : $t('payment.reportPayment') }}
          </button>
        </div>
      </div>

      <div v-else-if="activeEntry && activeEntry.paymentStatus === 'reported'" class="card text-center py-6">
        <p class="text-blue-600 font-semibold">{{ $t('payment.alreadyReported') }}</p>
        <p v-if="activeEntry.paymentNote" class="text-sm text-gray-500 mt-2">
          {{ $t('payment.note') }}: {{ activeEntry.paymentNote }}
        </p>
      </div>

      <!-- History -->
      <div v-if="historyEntries.length > 0" class="card mt-8">
        <h2 class="text-lg font-semibold text-primary mb-4">{{ $t('payment.history') }}</h2>
        <ul class="divide-y divide-gray-100">
          <li v-for="e in historyEntries" :key="e._id" class="py-2 flex items-center justify-between text-sm">
            <span class="font-medium text-gray-700">
              {{ $t('predictions.entryNumber', { n: e.entryNumber }) }}
            </span>
            <span class="flex items-center gap-2">
              <span :class="[
                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                e.paymentStatus === 'confirmed' ? 'bg-green-100 text-green-800' :
                e.paymentStatus === 'reported' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-600'
              ]">{{ $t(`payment.status${capitalize(e.paymentStatus)}Short`) }}</span>
              <span :class="[
                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                e.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              ]">{{ $t(`payment.entryStatus${capitalize(e.status)}`) }}</span>
            </span>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { PaymentConfig, Entry } from '~/types'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const toast = useToast()
const authStore = useAuthStore()
const entriesStore = useEntriesStore()
const { apiFetch } = useApi()
const config = ref<PaymentConfig | null>(null)
const loading = ref(true)
const reporting = ref(false)
const creating = ref(false)
const note = ref('')
const copiedKey = ref<string | null>(null)

const activeEntry = computed<Entry | null>(() => entriesStore.activeEntry)
const historyEntries = computed<Entry[]>(() =>
  entriesStore.entries.filter((e) => !activeEntry.value || e._id !== activeEntry.value._id),
)

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

async function copyToClipboard(text: string, key: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    setTimeout(() => { copiedKey.value = null }, 2000)
  } catch {}
}

async function reportPayment() {
  reporting.value = true
  try {
    await entriesStore.reportPayment(note.value)
    await authStore.fetchProfile()
    toast.success(t('payment.reported'))
  } catch (e: any) {
    toast.error(e?.data?.message || t('payment.reportFailed'))
  } finally {
    reporting.value = false
  }
}

async function createNewEntry() {
  creating.value = true
  try {
    await entriesStore.createNewEntry()
    toast.success(t('predictions.newEntryCreated'))
  } catch (e: any) {
    toast.error(e?.data?.message || t('predictions.newEntryFailed'))
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  try {
    await Promise.allSettled([
      authStore.fetchProfile(),
      entriesStore.fetchMine(),
      apiFetch<PaymentConfig>('/api/payments/config').then((c) => (config.value = c)),
    ])
  } finally {
    loading.value = false
  }
})
</script>
