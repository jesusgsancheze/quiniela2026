import { defineStore } from 'pinia'
import type { User, AuthResponse } from '~/types'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    token: null as string | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
    isActive: (state) => state.user?.status === 'active',
    fullName: (state) =>
      state.user ? `${state.user.firstName} ${state.user.lastName}` : '',
  },

  actions: {
    setAuth(data: AuthResponse) {
      this.token = data.access_token
      this.user = data.user
      if (import.meta.client) {
        localStorage.setItem('token', data.access_token)
        localStorage.setItem('user', JSON.stringify(data.user))
      }
    },

    async loadFromStorage() {
      if (import.meta.client) {
        const token = localStorage.getItem('token')
        const user = localStorage.getItem('user')
        if (token && user) {
          this.token = token
          this.user = JSON.parse(user)
        }
      }
    },

    async fetchProfile() {
      if (!this.token) return
      const { apiFetch } = useApi()
      try {
        const user = await apiFetch<User>('/api/users/me')
        this.user = { ...user, id: user._id || user.id }
        if (import.meta.client) {
          localStorage.setItem('user', JSON.stringify(this.user))
        }
      } catch {
        this.logout()
      }
    },

    logout() {
      this.token = null
      this.user = null
      if (import.meta.client) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
      navigateTo('/login')
    },
  },
})
