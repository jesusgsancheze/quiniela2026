<template>
  <div class="min-h-screen bg-surface">
    <!-- Header -->
    <header class="bg-primary-dark text-white shadow-lg">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <NuxtLink to="/" class="flex items-center gap-3">
            <span class="text-xl font-bold">Quiniela 2026</span>
            <span class="text-accent text-sm hidden sm:inline">FIFA World Cup</span>
          </NuxtLink>

          <nav class="flex items-center gap-4">
            <template v-if="authStore.isAdmin">
              <NuxtLink to="/admin/games" class="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                Games
              </NuxtLink>
              <NuxtLink to="/admin/players" class="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                Players
              </NuxtLink>
            </template>
            <template v-else>
              <NuxtLink to="/predictions" class="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                My Predictions
              </NuxtLink>
            </template>
            <NuxtLink to="/positions" class="text-gray-300 hover:text-white text-sm font-medium transition-colors">
              Positions
            </NuxtLink>

            <!-- User menu -->
            <div class="relative ml-4" ref="menuRef">
              <button @click="showMenu = !showMenu" class="flex items-center gap-2 bg-primary rounded-lg px-3 py-2 hover:bg-primary-light transition-colors">
                <div class="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-primary-dark font-bold text-sm">
                  {{ authStore.user?.firstName?.[0] }}{{ authStore.user?.lastName?.[0] }}
                </div>
                <span class="text-sm hidden sm:inline">{{ authStore.user?.firstName }}</span>
              </button>
              <div v-if="showMenu" class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
                <NuxtLink to="/profile" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 text-sm" @click="showMenu = false">
                  Profile
                </NuxtLink>
                <NuxtLink to="/change-password" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 text-sm" @click="showMenu = false">
                  Change Password
                </NuxtLink>
                <button @click="handleLogout" class="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 text-sm">
                  Logout
                </button>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-primary-dark text-gray-400 py-4 mt-auto">
      <div class="max-w-7xl mx-auto px-4 text-center text-sm">
        Quiniela 2026 - FIFA World Cup Canada/Mexico/USA
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const authStore = useAuthStore()
const showMenu = ref(false)
const menuRef = ref<HTMLElement>()

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
