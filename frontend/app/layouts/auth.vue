<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-dark via-primary to-primary-light flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-white mb-2">{{ $t('app.title') }}</h1>
        <p class="text-accent text-lg">{{ $t('app.subtitle') }}</p>
        <img src="~/assets/img/wc_img.webp" alt="Logo" class="mx-auto mt-6 w-24 h-24 object-contain" />
        <div class="flex justify-center gap-2 mt-3">
          <div class="w-8 h-1 bg-accent rounded"></div>
          <div class="w-8 h-1 bg-white rounded"></div>
          <div class="w-8 h-1 bg-secondary rounded"></div>
        </div>
        <!-- Language switcher on auth pages -->
        <ClientOnly>
          <div class="mt-4 flex items-center justify-center gap-2">
            <button
              @click="toggleLocale"
              class="inline-flex items-center gap-2 text-gray-300 hover:text-white text-sm font-medium bg-white/10 px-3 py-1.5 rounded transition-colors"
            >
              <img
                :src="locale === 'en' ? 'https://flagcdn.com/w40/mx.png' : 'https://flagcdn.com/w40/us.png'"
                :alt="locale === 'en' ? 'Español' : 'English'"
                class="w-5 h-3.5 object-cover rounded-sm"
              />
              {{ locale === 'en' ? 'Español' : 'English' }}
            </button>
            <button
              @click="showRules = true"
              class="inline-flex items-center gap-1.5 text-gray-300 hover:text-white text-sm font-medium bg-white/10 px-3 py-1.5 rounded transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ $t('nav.rules') }}
            </button>
          </div>
        </ClientOnly>
      </div>
      <slot />
    </div>

    <RulesModal v-model="showRules" />
  </div>
</template>

<script setup lang="ts">
const { locale, setLocale } = useI18n()
const showRules = ref(false)

function toggleLocale() {
  setLocale(locale.value === 'en' ? 'es' : 'en')
}
</script>
