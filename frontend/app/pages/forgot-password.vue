<template>
  <div class="card">
    <h2 class="text-2xl font-bold text-primary mb-2 text-center">{{ $t('auth.forgotPasswordTitle') }}</h2>
    <p class="text-gray-500 text-sm text-center mb-6">{{ $t('auth.forgotPasswordDesc') }}</p>

    <div v-if="success" class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
      {{ $t('auth.resetLinkSent') }}
    </div>

    <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
      {{ error }}
    </div>

    <form @submit.prevent="handleForgot" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('auth.email') }}</label>
        <input v-model="email" type="email" required class="input-field" :placeholder="$t('auth.emailPlaceholder')" />
      </div>

      <button type="submit" :disabled="loading" class="btn-primary w-full">
        {{ loading ? $t('auth.sending') : $t('auth.sendResetLink') }}
      </button>
    </form>

    <p class="text-center text-sm text-gray-600 mt-4">
      <NuxtLink to="/login" class="text-secondary font-semibold hover:underline">{{ $t('auth.backToLogin') }}</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})

const { t } = useI18n()
const { apiFetch } = useApi()
const email = ref('')
const loading = ref(false)
const success = ref(false)
const error = ref('')

async function handleForgot() {
  loading.value = true
  error.value = ''
  success.value = false
  try {
    await apiFetch('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value },
    })
    success.value = true
  } catch (e: any) {
    error.value = e?.data?.message || 'Error'
  } finally {
    loading.value = false
  }
}
</script>
