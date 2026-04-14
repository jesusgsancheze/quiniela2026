<template>
  <div class="min-h-screen bg-surface flex flex-col">
    <!-- Header -->
    <header class="bg-primary-dark text-white shadow-lg">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <NuxtLink to="/" class="flex items-center gap-3">
            <span class="text-xl font-bold">{{ $t('app.title') }}</span>
            <span class="text-accent text-sm hidden sm:inline">{{ $t('app.subtitle') }}</span>
          </NuxtLink>

          <ClientOnly>
            <nav class="flex items-center gap-4">
              <template v-if="authStore.isAdmin">
                <NuxtLink to="/admin/games" class="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                  {{ $t('nav.games') }}
                </NuxtLink>
                <NuxtLink to="/admin/players" class="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                  {{ $t('nav.players') }}
                </NuxtLink>
              </template>
              <template v-else>
                <NuxtLink to="/predictions" class="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                  {{ $t('nav.myPredictions') }}
                </NuxtLink>
              </template>
              <NuxtLink to="/standings" class="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                {{ $t('nav.standings') }}
              </NuxtLink>
              <NuxtLink to="/positions" class="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                {{ $t('nav.positions') }}
              </NuxtLink>

              <!-- Language switcher -->
              <button
                @click="toggleLocale"
                class="flex items-center gap-1.5 text-gray-300 hover:text-white text-sm font-medium transition-colors bg-primary px-2.5 py-1.5 rounded hover:bg-primary-light"
                :title="locale === 'en' ? 'Cambiar a Español' : 'Switch to English'"
              >
                <img
                  :src="locale === 'en' ? 'https://flagcdn.com/w40/mx.png' : 'https://flagcdn.com/w40/us.png'"
                  :alt="locale === 'en' ? 'Español' : 'English'"
                  class="w-5 h-3.5 object-cover rounded-sm"
                />
                {{ locale === 'en' ? 'ES' : 'EN' }}
              </button>

              <!-- User menu -->
              <div class="relative ml-2" ref="menuRef">
                <button @click="showMenu = !showMenu" class="flex items-center gap-2 bg-primary rounded-lg px-3 py-2 hover:bg-primary-light transition-colors">
                  <img
                    v-if="avatarUrl(authStore.user?.profilePicture)"
                    :src="avatarUrl(authStore.user?.profilePicture)!"
                    class="w-8 h-8 rounded-full object-cover"
                  />
                  <div v-else class="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-primary-dark font-bold text-sm">
                    {{ authStore.user?.firstName?.[0] }}{{ authStore.user?.lastName?.[0] }}
                  </div>
                  <span class="text-sm hidden sm:inline">{{ authStore.user?.firstName }}</span>
                </button>
                <div v-if="showMenu" class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
                  <NuxtLink to="/profile" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 text-sm" @click="showMenu = false">
                    {{ $t('nav.profile') }}
                  </NuxtLink>
                  <NuxtLink to="/change-password" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 text-sm" @click="showMenu = false">
                    {{ $t('nav.changePassword') }}
                  </NuxtLink>
                  <button @click="handleLogout" class="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 text-sm">
                    {{ $t('nav.logout') }}
                  </button>
                </div>
              </div>
            </nav>
          </ClientOnly>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-primary-dark text-gray-400 py-4 mt-auto">
      <div class="max-w-7xl mx-auto px-4 text-center text-sm">
        {{ $t('app.footer') }}
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const { locale, setLocale } = useI18n()
const authStore = useAuthStore()
const { avatarUrl } = useAvatar()
const showMenu = ref(false)
const menuRef = ref<HTMLElement>()

function toggleLocale() {
  setLocale(locale.value === 'en' ? 'es' : 'en')
}

function handleLogout() {
  showMenu.value = false
  authStore.logout()
}

onMounted(() => {
  document.addEventListener('click', (e) => {
    if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
      showMenu.value = false
    }
  })
})
</script>
