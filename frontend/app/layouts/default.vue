<template>
  <div class="min-h-screen bg-surface flex flex-col">
    <!-- Header -->
    <header class="bg-primary-dark text-white shadow-lg relative z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <NuxtLink to="/" class="flex items-center gap-3">
            <span class="text-xl font-bold">{{ $t('app.title') }}</span>
            <span class="text-accent text-sm hidden sm:inline">{{ $t('app.subtitle') }}</span>
            <img src="~/assets/img/wc_img.webp" alt="Logo" class="w-8 h-8 object-contain" />
          </NuxtLink>

          <ClientOnly>
            <!-- Desktop nav -->
            <nav class="hidden md:flex items-center gap-4">
              <template v-if="authStore.isAdmin">
                <NuxtLink to="/admin/games" class="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                  {{ $t('nav.games') }}
                </NuxtLink>
                <NuxtLink to="/admin/players" class="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                  {{ $t('nav.players') }}
                </NuxtLink>
                <NuxtLink to="/admin/payments" class="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                  {{ $t('nav.paymentSettings') }}
                </NuxtLink>
              </template>
              <template v-else>
                <NuxtLink to="/predictions" class="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                  {{ $t('nav.myPredictions') }}
                </NuxtLink>
                <NuxtLink to="/payment" class="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                  {{ $t('nav.payment') }}
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
                  <span class="text-sm">{{ authStore.user?.firstName }}</span>
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

            <!-- Mobile hamburger button -->
            <button @click="mobileOpen = !mobileOpen" class="md:hidden text-white p-2">
              <svg v-if="!mobileOpen" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </ClientOnly>
        </div>
      </div>

      <!-- Mobile menu -->
      <ClientOnly>
        <Transition name="slide">
          <div v-if="mobileOpen" class="md:hidden bg-primary-dark border-t border-primary">
            <div class="px-4 py-4 space-y-1">
              <!-- User info -->
              <div class="flex items-center gap-3 pb-3 mb-3 border-b border-primary">
                <img
                  v-if="avatarUrl(authStore.user?.profilePicture)"
                  :src="avatarUrl(authStore.user?.profilePicture)!"
                  class="w-10 h-10 rounded-full object-cover"
                />
                <div v-else class="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-primary-dark font-bold text-sm">
                  {{ authStore.user?.firstName?.[0] }}{{ authStore.user?.lastName?.[0] }}
                </div>
                <div>
                  <p class="text-white font-medium text-sm">{{ authStore.user?.firstName }} {{ authStore.user?.lastName }}</p>
                  <p class="text-gray-400 text-xs">{{ authStore.user?.email }}</p>
                </div>
              </div>

              <!-- Nav links -->
              <template v-if="authStore.isAdmin">
                <NuxtLink to="/admin/games" class="block py-2 px-3 text-gray-300 hover:text-white hover:bg-primary rounded text-sm" @click="mobileOpen = false">
                  {{ $t('nav.games') }}
                </NuxtLink>
                <NuxtLink to="/admin/players" class="block py-2 px-3 text-gray-300 hover:text-white hover:bg-primary rounded text-sm" @click="mobileOpen = false">
                  {{ $t('nav.players') }}
                </NuxtLink>
                <NuxtLink to="/admin/payments" class="block py-2 px-3 text-gray-300 hover:text-white hover:bg-primary rounded text-sm" @click="mobileOpen = false">
                  {{ $t('nav.paymentSettings') }}
                </NuxtLink>
              </template>
              <template v-else>
                <NuxtLink to="/predictions" class="block py-2 px-3 text-gray-300 hover:text-white hover:bg-primary rounded text-sm" @click="mobileOpen = false">
                  {{ $t('nav.myPredictions') }}
                </NuxtLink>
                <NuxtLink to="/payment" class="block py-2 px-3 text-gray-300 hover:text-white hover:bg-primary rounded text-sm" @click="mobileOpen = false">
                  {{ $t('nav.payment') }}
                </NuxtLink>
              </template>
              <NuxtLink to="/standings" class="block py-2 px-3 text-gray-300 hover:text-white hover:bg-primary rounded text-sm" @click="mobileOpen = false">
                {{ $t('nav.standings') }}
              </NuxtLink>
              <NuxtLink to="/positions" class="block py-2 px-3 text-gray-300 hover:text-white hover:bg-primary rounded text-sm" @click="mobileOpen = false">
                {{ $t('nav.positions') }}
              </NuxtLink>

              <div class="border-t border-primary pt-3 mt-3 space-y-1">
                <NuxtLink to="/profile" class="block py-2 px-3 text-gray-300 hover:text-white hover:bg-primary rounded text-sm" @click="mobileOpen = false">
                  {{ $t('nav.profile') }}
                </NuxtLink>
                <NuxtLink to="/change-password" class="block py-2 px-3 text-gray-300 hover:text-white hover:bg-primary rounded text-sm" @click="mobileOpen = false">
                  {{ $t('nav.changePassword') }}
                </NuxtLink>

                <!-- Language switcher -->
                <button
                  @click="toggleLocale"
                  class="w-full flex items-center gap-2 py-2 px-3 text-gray-300 hover:text-white hover:bg-primary rounded text-sm"
                >
                  <img
                    :src="locale === 'en' ? 'https://flagcdn.com/w40/mx.png' : 'https://flagcdn.com/w40/us.png'"
                    class="w-5 h-3.5 object-cover rounded-sm"
                  />
                  {{ locale === 'en' ? 'Español' : 'English' }}
                </button>

                <button @click="handleLogout" class="w-full text-left py-2 px-3 text-red-400 hover:text-red-300 hover:bg-primary rounded text-sm">
                  {{ $t('nav.logout') }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </ClientOnly>
    </header>

    <!-- Main content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
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
const mobileOpen = ref(false)
const menuRef = ref<HTMLElement>()

function toggleLocale() {
  setLocale(locale.value === 'en' ? 'es' : 'en')
}

function handleLogout() {
  showMenu.value = false
  mobileOpen.value = false
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

<style scoped>
.slide-enter-active {
  transition: all 0.25s ease-out;
}
.slide-leave-active {
  transition: all 0.2s ease-in;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}
.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
