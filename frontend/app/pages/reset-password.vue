<template>
  <div class="card">
    <h2 class="text-2xl font-bold text-primary mb-6 text-center">{{ $t('auth.resetPasswordTitle') }}</h2>

    <div v-if="success" class="py-4">
      <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
        {{ $t('auth.resetSuccess') }}
      </div>
      <NuxtLink to="/login" class="btn-primary w-full inline-block text-center">{{ $t('auth.backToLogin') }}</NuxtLink>
    </div>

    <template v-else>
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
        {{ error }}
      </div>

      <form @submit.prevent="handleReset" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('auth.password') }}</label>
          <input v-model="newPassword" type="password" required minlength="6" class="input-field" :placeholder="$t('auth.minPassword')" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('auth.confirmPassword') }}</label>
          <input v-model="confirmPassword" type="password" required class="input-field" />
        </div>

        <button type="submit" :disabled="loading" class="btn-primary w-full">
          {{ loading ? $t('auth.resetting') : $t('auth.resetPasswordBtn') }}
        </button>
      </form>
    </template>

    <p v-if="!success" class="text-center text-sm text-gray-600 mt-4">
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
const route = useRoute()
const { apiFetch } = useApi()
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const success = ref(false)
const error = ref('')

async function handleReset() {
  if (newPassword.value !== confirmPassword.value) {
    error.value = t('auth.passwordsNoMatch')
    return
  }
  loading.value = true
  error.value = ''
  try {
    await apiFetch('/api/auth/reset-password', {
      method: 'POST',
      body: {
        token: route.query.token as string,
        newPassword: newPassword.value,
      },
    })
    success.value = true
  } catch (e: any) {
    error.value = e?.data?.message || t('auth.resetFailed')
  } finally {
    loading.value = false
  }
}
</script>
