<template>
  <div class="card text-center">
    <h2 class="text-2xl font-bold text-primary mb-6">{{ $t('auth.verifyTitle') }}</h2>

    <div v-if="loading" class="py-8 text-gray-500">
      {{ $t('auth.verifying') }}
    </div>

    <div v-else-if="success" class="py-4">
      <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
        {{ $t('auth.verifySuccess') }}
      </div>
      <NuxtLink to="/login" class="btn-primary inline-block">{{ $t('auth.backToLogin') }}</NuxtLink>
    </div>

    <div v-else class="py-4">
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
        {{ $t('auth.verifyFailed') }}
      </div>
      <NuxtLink to="/login" class="btn-outline inline-block">{{ $t('auth.backToLogin') }}</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})

const route = useRoute()
const { apiFetch } = useApi()
const loading = ref(true)
const success = ref(false)

onMounted(async () => {
  const token = route.query.token as string
  if (!token) {
    loading.value = false
    return
  }
  try {
    await apiFetch(`/api/auth/verify-email?token=${token}`)
    success.value = true
  } catch {}
  loading.value = false
})
</script>
