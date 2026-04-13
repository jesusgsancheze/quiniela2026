import { defineStore } from 'pinia'
import type { Match } from '~/types'

export const useMatchesStore = defineStore('matches', {
  state: () => ({
    matches: [] as Match[],
    loading: false,
  }),

  getters: {
    groupStageMatches: (state) =>
      state.matches.filter((m) => m.stage === 'group'),
    knockoutMatches: (state) =>
      state.matches.filter((m) => m.stage !== 'group'),
    matchesByGroup: (state) => {
      const groups: Record<string, Match[]> = {}
      state.matches
        .filter((m) => m.stage === 'group')
        .forEach((m) => {
          const groupName = m.group?.name || 'Unknown'
          if (!groups[groupName]) groups[groupName] = []
          groups[groupName].push(m)
        })
      return groups
    },
  },

  actions: {
    async fetchMatches(filters?: {
      stage?: string
      group?: string
      status?: string
    }) {
      this.loading = true
      try {
        const { apiFetch } = useApi()
        const params = new URLSearchParams()
        if (filters?.stage) params.set('stage', filters.stage)
        if (filters?.group) params.set('group', filters.group)
        if (filters?.status) params.set('status', filters.status)
        const query = params.toString()
        this.matches = await apiFetch<Match[]>(
          `/api/matches${query ? `?${query}` : ''}`,
        )
      } finally {
        this.loading = false
      }
    },
  },
})
