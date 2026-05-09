import { defineStore } from 'pinia'
import type { Entry } from '~/types'

export const useEntriesStore = defineStore('entries', {
  state: () => ({
    entries: [] as Entry[],
    activeEntry: null as Entry | null,
    loading: false,
  }),

  getters: {
    latestEntry(state): Entry | null {
      if (state.entries.length === 0) return null
      const sorted = [...state.entries].sort((a, b) => b.entryNumber - a.entryNumber)
      return sorted[0] ?? null
    },
    canRequestNewEntry(): boolean {
      const latest = this.latestEntry
      return !!latest && latest.status === 'completed'
    },
    pendingPaymentEntry(): Entry | null {
      const latest = this.latestEntry
      if (!latest) return null
      if (latest.paymentStatus === 'confirmed') return null
      return latest
    },
  },

  actions: {
    async fetchMine() {
      const { apiFetch } = useApi()
      this.loading = true
      try {
        const [list, active] = await Promise.all([
          apiFetch<Entry[]>('/api/entries/me'),
          apiFetch<Entry | null>('/api/entries/me/active'),
        ])
        this.entries = list
        this.activeEntry = active
      } finally {
        this.loading = false
      }
    },

    async createNewEntry() {
      const { apiFetch } = useApi()
      const created = await apiFetch<Entry>('/api/entries/new', {
        method: 'POST',
      })
      await this.fetchMine()
      return created
    },

    async reportPayment(note: string) {
      const { apiFetch } = useApi()
      const updated = await apiFetch<Entry>('/api/entries/me/report', {
        method: 'PATCH',
        body: { note },
      })
      await this.fetchMine()
      return updated
    },
  },
})
