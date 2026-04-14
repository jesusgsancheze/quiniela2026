<template>
  <div class="max-w-lg mx-auto">
    <h1 class="text-3xl font-bold text-primary mb-6">{{ $t('changePassword.title') }}</h1>

    <div v-if="success" class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
      {{ success }}
    </div>
    <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
      {{ error }}
    </div>

    <form @submit.prevent="handleChange" class="card space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('changePassword.currentPassword') }}</label>
        <input v-model="form.currentPassword" type="password" required class="input-field" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('changePassword.newPassword') }}</label>
        <input v-model="form.newPassword" type="password" required minlength="6" class="input-field" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('changePassword.confirmNewPassword') }}</label>
        <input v-model="form.confirmPassword" type="password" required class="input-field" />
      </div>
      <button type="submit" :disabled="saving" class="btn-primary">
        {{ saving ? $t('changePassword.changing') : $t('changePassword.change') }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const { apiFetch } = useApi()
const saving = ref(false)
const success = ref('')
const error = ref('')
const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

async function handleChange() {
  error.value = ''
  success.value = ''
  if (form.newPassword !== form.confirmPassword) {
    error.value = t('changePassword.noMatch')
    return
  }
  saving.value = true
  try {
    await apiFetch('/api/auth/change-password', {
      method: 'POST',
      body: {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      },
    })
    success.value = t('changePassword.changed')
    form.currentPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''
  } catch (e: any) {
    error.value = e?.data?.message || t('changePassword.changeFailed')
  } finally {
    saving.value = false
  }
}
</script>
