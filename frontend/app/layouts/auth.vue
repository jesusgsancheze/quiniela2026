<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-dark via-primary to-primary-light flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-white mb-2">{{ $t('app.title') }}</h1>
        <p class="text-accent text-lg">{{ $t('app.subtitle') }}</p>
        <div class="flex justify-center gap-2 mt-3">
          <div class="w-8 h-1 bg-accent rounded"></div>
          <div class="w-8 h-1 bg-white rounded"></div>
          <div class="w-8 h-1 bg-secondary rounded"></div>
        </div>
        <!-- Language switcher on auth pages -->
        <ClientOnly>
          <button
            @click="toggleLocale"
            class="mt-4 inline-flex items-center gap-2 text-gray-300 hover:text-white text-sm font-medium bg-white/10 px-3 py-1.5 rounded transition-colors"
          >
            <img
              :src="locale === 'en' ? 'https://flagcdn.com/w40/mx.png' : 'https://flagcdn.com/w40/us.png'"
              :alt="locale === 'en' ? 'Español' : 'English'"
              class="w-5 h-3.5 object-cover rounded-sm"
            />
            {{ locale === 'en' ? 'Español' : 'English' }}
          </button>
        </ClientOnly>
      </div>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const { locale, setLocale } = useI18n()

function toggleLocale() {
  setLocale(locale.value === 'en' ? 'es' : 'en')
}
</script>
