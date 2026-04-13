<template>
  <div class="card">
    <h2 class="text-2xl font-bold text-primary mb-6 text-center">Create Account</h2>

    <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
      {{ error }}
    </div>

    <form @submit.prevent="handleRegister" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
          <input v-model="form.firstName" type="text" required class="input-field" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <input v-model="form.lastName" type="text" required class="input-field" />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input v-model="form.email" type="email" required class="input-field" placeholder="your@email.com" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input v-model="form.password" type="password" required minlength="6" class="input-field" placeholder="Minimum 6 characters" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
        <input v-model="form.confirmPassword" type="password" required class="input-field" />
      </div>

      <button type="submit" :disabled="loading" class="btn-primary w-full">
        {{ loading ? 'Creating account...' : 'Create Account' }}
      </button>
    </form>

    <p class="text-center text-sm text-gray-600 mt-4">
      Already have an account?
      <NuxtLink to="/login" class="text-secondary font-semibold hover:underline">Sign In</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import type { AuthResponse } from '~/types'

definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})

const authStore = useAuthStore()
const { apiFetch } = useApi()
const loading = ref(false)
const error = ref('')
const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
})

async function handleRegister() {
  if (form.password !== form.confirmPassword) {
    error.value = 'Passwords do not match'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const { confirmPassword, ...body } = form
    const data = await apiFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body,
    })
    authStore.setAuth(data)
    navigateTo('/')
  } catch (e: any) {
    error.value = e?.data?.message || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>
