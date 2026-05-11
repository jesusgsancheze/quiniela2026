import { defineStore } from 'pinia'
import type { Entry } from '~/types'

function pickActiveEntry(list: Entry[]): Entry | null {
  const active = list.filter((e) => e.status === 'active')
  if (active.length === 0) return null
  return active.reduce((a, b) => (a.entryNumber > b.entryNumber ? a : b))
}

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
        const list = await apiFetch<Entry[]>('/api/entries/me')
        this.entries = list
        this.activeEntry = pickActiveEntry(list)
      } finally {
        this.loading = false
      }
    },

    async createNewEntry() {
      const { apiFetch } = useApi()
      const created = await apiFetch<Entry>('/api/entries/new', {
        method: 'POST',
      })
      if (!this.entries.some((e) => e._id === created._id)) {
        this.entries = [created, ...this.entries]
      }
      this.activeEntry = pickActiveEntry(this.entries) || created
      try {
        await this.fetchMine()
      } catch {
        // Keep the optimistic state if the refresh fails.
      }
      if (!this.activeEntry) {
        this.activeEntry = created
        if (!this.entries.some((e) => e._id === created._id)) {
          this.entries = [created, ...this.entries]
        }
      }
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
