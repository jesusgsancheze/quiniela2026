import { defineStore } from 'pinia'
import type { Prediction, PredictionProgress } from '~/types'

export const usePredictionsStore = defineStore('predictions', {
  state: () => ({
    predictions: [] as Prediction[],
    progress: null as PredictionProgress | null,
    loading: false,
  }),

  getters: {
    predictionByMatch:
      (state) =>
      (matchId: string): Prediction | undefined =>
        state.predictions.find(
          (p) =>
            (typeof p.match === 'string' ? p.match : p.match._id) === matchId,
        ),
  },

  actions: {
    async fetchPredictions(entryId?: string) {
      this.loading = true
      try {
        const { apiFetch } = useApi()
        const url = entryId
          ? `/api/predictions/me?entryId=${encodeURIComponent(entryId)}`
          : '/api/predictions/me'
        this.predictions = await apiFetch<Prediction[]>(url)
      } finally {
        this.loading = false
      }
    },

    async fetchProgress(entryId?: string) {
      const { apiFetch } = useApi()
      const url = entryId
        ? `/api/predictions/progress?entryId=${encodeURIComponent(entryId)}`
        : '/api/predictions/progress'
      this.progress = await apiFetch<PredictionProgress>(url)
    },

    async savePrediction(
      matchId: string,
      score1: number,
      score2: number,
      entryId?: string,
    ) {
      const { apiFetch } = useApi()
      const prediction = await apiFetch<Prediction>('/api/predictions', {
        method: 'PUT',
        body: entryId ? { matchId, score1, score2, entryId } : { matchId, score1, score2 },
      })
      const index = this.predictions.findIndex(
        (p) =>
          (typeof p.match === 'string' ? p.match : p.match._id) === matchId,
      )
      if (index >= 0) {
        this.predictions[index] = prediction
      } else {
        this.predictions.push(prediction)
      }
      await this.fetchProgress(entryId)
      return prediction
    },
  },
})
