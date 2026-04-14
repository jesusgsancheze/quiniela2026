<template>
  <div class="card">
    <h2 class="text-2xl font-bold text-primary mb-6 text-center">{{ $t('auth.signIn') }}</h2>

    <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
      {{ error }}
    </div>

    <form @submit.prevent="handleLogin" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('auth.email') }}</label>
        <input v-model="form.email" type="email" required class="input-field" :placeholder="$t('auth.emailPlaceholder')" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('auth.password') }}</label>
        <input v-model="form.password" type="password" required class="input-field" />
      </div>

      <button type="submit" :disabled="loading" class="btn-primary w-full">
        {{ loading ? $t('auth.signingIn') : $t('auth.signIn') }}
      </button>

      <div class="text-center">
        <NuxtLink to="/forgot-password" class="text-sm text-gray-500 hover:text-secondary hover:underline">
          {{ $t('auth.forgotPassword') }}
        </NuxtLink>
      </div>
    </form>

    <!-- Resend verification if email not verified -->
    <div v-if="showResend" class="mt-4">
      <button @click="resendVerification" :disabled="resending" class="btn-outline w-full text-sm">
        {{ resending ? $t('auth.sending') : $t('auth.resendVerification') }}
      </button>
      <p v-if="resendSuccess" class="text-green-600 text-xs mt-2 text-center">{{ $t('auth.resendSent') }}</p>
    </div>

    <p class="text-center text-sm text-gray-600 mt-4">
      {{ $t('auth.noAccount') }}
      <NuxtLink to="/register" class="text-secondary font-semibold hover:underline">{{ $t('auth.register') }}</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import type { AuthResponse } from '~/types'

definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})

const { t } = useI18n()
const authStore = useAuthStore()
const { apiFetch } = useApi()
const loading = ref(false)
const error = ref('')
const showResend = ref(false)
const resending = ref(false)
const resendSuccess = ref(false)
const form = reactive({ email: '', password: '' })

async function handleLogin() {
  loading.value = true
  error.value = ''
  showResend.value = false
  try {
    const data = await apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: form,
    })
    authStore.setAuth(data)
    navigateTo('/')
  } catch (e: any) {
    const msg = e?.data?.message || ''
    if (msg.includes('verify your email')) {
      error.value = t('auth.emailNotVerified')
      showResend.value = true
    } else {
      error.value = msg || t('auth.invalidCredentials')
    }
  } finally {
    loading.value = false
  }
}

async function resendVerification() {
  resending.value = true
  resendSuccess.value = false
  try {
    await apiFetch('/api/auth/resend-verification', {
      method: 'POST',
      body: { email: form.email },
    })
    resendSuccess.value = true
  } catch {}
  resending.value = false
}
</script>
