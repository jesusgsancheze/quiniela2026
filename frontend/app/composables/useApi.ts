export function useApi() {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()

  const apiFetch = async <T>(
    url: string,
    options: Record<string, any> = {},
  ): Promise<T> => {
    const headers: Record<string, string> = {
      ...(options.headers || {}),
    }

    if (authStore.token) {
      headers['Authorization'] = `Bearer ${authStore.token}`
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await $fetch<T>(`${config.public.apiBase}${url}`, {
      ...options,
      headers,
    })

    return response
  }

  return { apiFetch }
}
