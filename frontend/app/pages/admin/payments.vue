<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold text-primary mb-6">{{ $t('admin.payments.title') }}</h1>

    <div v-if="success" class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
      {{ success }}
    </div>

    <form @submit.prevent="saveConfig" class="card space-y-5">
      <!-- Price -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('admin.payments.price') }}</label>
          <input v-model.number="form.price" type="number" min="0" step="0.01" required class="input-field" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('admin.payments.currency') }}</label>
          <input v-model="form.currency" type="text" required class="input-field" />
        </div>
      </div>

      <!-- Payment methods -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">{{ $t('admin.payments.methods') }}</label>
        <div class="space-y-3">
          <div v-for="(method, i) in form.paymentMethods" :key="i" class="p-3 bg-gray-50 rounded-lg space-y-2 relative">
            <div class="flex gap-2">
              <input v-model="method.label" type="text" :placeholder="$t('admin.payments.methodLabel')" class="input-field text-sm flex-1" />
              <button type="button" @click="removeMethod(i)" class="text-red-500 hover:text-red-700 text-sm">
                {{ $t('admin.payments.removeMethod') }}
              </button>
            </div>
            <input v-model="method.value" type="text" :placeholder="$t('admin.payments.methodValue')" class="input-field text-sm" />
            <textarea v-model="method.details" :placeholder="$t('admin.payments.methodDetails')" class="input-field text-sm" rows="2"></textarea>
          </div>
        </div>
        <button type="button" @click="addMethod" class="btn-outline text-sm px-3 py-1 mt-3">
          + {{ $t('admin.payments.addMethod') }}
        </button>
      </div>

      <!-- Instructions -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('admin.payments.instructions') }}</label>
        <textarea v-model="form.instructions" class="input-field" rows="3"></textarea>
      </div>

      <!-- Contact -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('admin.payments.contactEmail') }}</label>
          <input v-model="form.contactEmail" type="email" class="input-field" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('admin.payments.contactPhone') }}</label>
          <input v-model="form.contactPhone" type="text" class="input-field" />
        </div>
      </div>

      <button type="submit" :disabled="saving" class="btn-primary">
        {{ saving ? $t('admin.payments.saving') : $t('admin.payments.save') }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { PaymentConfig } from '~/types'

definePageMeta({ middleware: 'admin' })

const { t } = useI18n()
const toast = useToast()
const { apiFetch } = useApi()
const saving = ref(false)
const success = ref('')

const form = reactive({
  price: 0,
  currency: 'MXN',
  paymentMethods: [] as { label: string; value: string }[],
  instructions: '',
  contactEmail: '',
  contactPhone: '',
})

function addMethod() {
  form.paymentMethods.push({ label: '', value: '', details: '' })
}

function removeMethod(i: number) {
  form.paymentMethods.splice(i, 1)
}

async function saveConfig() {
  saving.value = true
  success.value = ''
  try {
    await apiFetch('/api/payments/config', {
      method: 'PUT',
      body: { ...form },
    })
    success.value = t('admin.payments.saved')
  } catch (e: any) {
    toast.error(e?.data?.message || t('admin.payments.saveFailed'))
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const config = await apiFetch<PaymentConfig | null>('/api/payments/config')
    if (config) {
      form.price = config.price
      form.currency = config.currency
      form.paymentMethods = config.paymentMethods || []
      form.instructions = config.instructions || ''
      form.contactEmail = config.contactEmail || ''
      form.contactPhone = config.contactPhone || ''
    }
  } catch {}
})
</script>
