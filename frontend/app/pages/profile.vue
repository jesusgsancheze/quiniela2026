<template>
  <div class="max-w-lg mx-auto">
    <h1 class="text-3xl font-bold text-primary mb-6">{{ $t('profile.title') }}</h1>

    <div v-if="success" class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
      {{ success }}
    </div>
    <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
      {{ error }}
    </div>

    <div class="card mb-6">
      <h2 class="text-lg font-semibold text-primary mb-4">{{ $t('profile.picture') }}</h2>
      <div class="flex items-center gap-4">
        <img
          v-if="avatarUrl(authStore.user?.profilePicture)"
          :src="avatarUrl(authStore.user?.profilePicture)!"
          class="w-20 h-20 rounded-full object-cover"
        />
        <div v-else class="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white font-bold text-2xl">
          {{ authStore.user?.firstName?.[0] }}{{ authStore.user?.lastName?.[0] }}
        </div>
        <div>
          <input type="file" accept="image/jpeg,image/png,image/webp" @change="handleAvatarUpload" class="text-sm" />
          <p class="text-xs text-gray-400 mt-1">{{ $t('profile.maxSize') }}</p>
        </div>
      </div>
    </div>

    <form @submit.prevent="handleUpdate" class="card">
      <h2 class="text-lg font-semibold text-primary mb-4">{{ $t('profile.personalInfo') }}</h2>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('auth.firstName') }}</label>
            <input v-model="form.firstName" type="text" required class="input-field" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('auth.lastName') }}</label>
            <input v-model="form.lastName" type="text" required class="input-field" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('auth.email') }}</label>
          <input v-model="form.email" type="email" required class="input-field" />
        </div>
        <button type="submit" :disabled="saving" class="btn-primary">
          {{ saving ? $t('profile.saving') : $t('profile.updateProfile') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { User } from '~/types'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const authStore = useAuthStore()
const { apiFetch } = useApi()
const { avatarUrl } = useAvatar()
const saving = ref(false)
const success = ref('')
const error = ref('')

const form = reactive({
  firstName: authStore.user?.firstName || '',
  lastName: authStore.user?.lastName || '',
  email: authStore.user?.email || '',
})

async function handleUpdate() {
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    await apiFetch<User>('/api/users/me', {
      method: 'PATCH',
      body: form,
    })
    await authStore.fetchProfile()
    success.value = t('profile.updated')
  } catch (e: any) {
    error.value = e?.data?.message || t('profile.updateFailed')
  } finally {
    saving.value = false
  }
}

async function handleAvatarUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('avatar', file)
  try {
    await apiFetch('/api/users/me/avatar', {
      method: 'POST',
      body: formData,
    })
    await authStore.fetchProfile()
    success.value = t('profile.pictureUpdated')
  } catch (e: any) {
    error.value = e?.data?.message || t('profile.pictureFailed')
  }
}
</script>
