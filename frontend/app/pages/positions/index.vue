<template>
  <div>
    <h1 class="text-3xl font-bold text-primary mb-6">Leaderboard</h1>

    <div v-if="loading" class="text-center py-12 text-gray-500">
      Loading positions...
    </div>

    <div v-else-if="rankings.length === 0" class="card text-center py-12">
      <p class="text-gray-500 text-lg">No results yet</p>
      <p class="text-gray-400 text-sm mt-2">Positions will appear once match results are entered</p>
    </div>

    <div v-else class="card overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b-2 border-primary">
            <th class="py-3 px-4 text-left text-sm font-semibold text-primary">#</th>
            <th class="py-3 px-4 text-left text-sm font-semibold text-primary">Player</th>
            <th class="py-3 px-4 text-center text-sm font-semibold text-primary">Matches</th>
            <th class="py-3 px-4 text-center text-sm font-semibold text-primary">Points</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in rankings"
            :key="entry.userId"
            :class="[
              'border-b border-gray-100 hover:bg-gray-50 transition-colors',
              isCurrentUser(entry.userId) ? 'bg-accent/10' : ''
            ]"
          >
            <td class="py-3 px-4">
              <span :class="[
                'inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm',
                entry.rank === 1 ? 'bg-accent text-primary-dark' :
                entry.rank === 2 ? 'bg-gray-300 text-gray-700' :
                entry.rank === 3 ? 'bg-orange-200 text-orange-800' :
                'bg-gray-100 text-gray-600'
              ]">
                {{ entry.rank }}
              </span>
            </td>
            <td class="py-3 px-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                  {{ entry.firstName[0] }}{{ entry.lastName[0] }}
                </div>
                <div>
                  <p class="font-medium text-gray-800">{{ entry.firstName }} {{ entry.lastName }}</p>
                  <p class="text-xs text-gray-400">{{ entry.email }}</p>
                </div>
              </div>
            </td>
            <td class="py-3 px-4 text-center text-gray-600">{{ entry.matchesScored }}</td>
            <td class="py-3 px-4 text-center">
              <span class="font-bold text-lg text-primary">{{ entry.totalPoints }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LeaderboardEntry } from '~/types'

definePageMeta({ middleware: 'auth' })

const authStore = useAuthStore()
const { apiFetch } = useApi()
const rankings = ref<LeaderboardEntry[]>([])
const loading = ref(true)

function isCurrentUser(userId: string): boolean {
  const user = authStore.user
  return user?.id === userId || user?._id === userId
}

onMounted(async () => {
  try {
    rankings.value = await apiFetch<LeaderboardEntry[]>('/api/leaderboard')
  } finally {
    loading.value = false
  }
})
</script>
