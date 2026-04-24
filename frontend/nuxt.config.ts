// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  app: {
    head: {
      title: 'Quiniela 2026 - FIFA World Cup',
      link: [
        { rel: 'icon', type: 'image/webp', href: '/favicon.webp' },
      ],
      meta: [
        { name: 'description', content: 'Quiniela de la Copa del Mundo FIFA 2026 - Football Pools' },
      ],
    },
  },
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss', '@nuxtjs/i18n'],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3001',
    },
  },
  css: ['~/assets/css/main.css'],
  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'es', name: 'Español', file: 'es.json' },
    ],
    defaultLocale: 'es',
    langDir: '../i18n/locales/',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      fallbackLocale: 'es',
    },
  },
})
