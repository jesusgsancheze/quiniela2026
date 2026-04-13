export default defineNuxtRouteMiddleware(async () => {
  const authStore = useAuthStore()
  await authStore.loadFromStorage()

  if (authStore.isAuthenticated) {
    return navigateTo('/')
  }
})
