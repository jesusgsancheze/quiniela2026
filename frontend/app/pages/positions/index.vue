<template>
  <div>
    <h1 class="text-3xl font-bold text-primary mb-6">{{ $t('positions.title') }}</h1>

    <div v-if="loading" class="text-center py-12 text-gray-500">
      {{ $t('positions.loading') }}
    </div>

    <div v-else-if="!hasUnlockedAccess" class="card text-center py-12">
      <p class="text-gray-700 text-lg font-semibold">{{ $t('positions.lockedTitle') }}</p>
      <p class="text-gray-500 text-sm mt-2 mb-4">{{ $t('positions.lockedDesc') }}</p>
      <NuxtLink to="/predictions" class="btn-primary inline-block">
        {{ $t('positions.lockedCta') }}
      </NuxtLink>
    </div>

    <div v-else-if="rankings.length === 0" class="card text-center py-12">
      <p class="text-gray-500 text-lg">{{ $t('positions.noResults') }}</p>
      <p class="text-gray-400 text-sm mt-2">{{ $t('positions.noResultsDesc') }}</p>
    </div>

    <div v-else class="card p-0 sm:p-4">
      <table class="w-full table-fixed sm:table-auto">
        <thead>
          <tr class="border-b-2 border-primary">
            <th class="py-3 px-2 sm:px-4 text-left text-xs sm:text-sm font-semibold text-primary w-10 sm:w-auto">#</th>
            <th class="py-3 px-2 sm:px-4 text-left text-xs sm:text-sm font-semibold text-primary">{{ $t('positions.player') }}</th>
            <th class="hidden sm:table-cell py-3 px-4 text-center text-sm font-semibold text-primary">{{ $t('positions.entry') }}</th>
            <th class="hidden md:table-cell py-3 px-4 text-center text-sm font-semibold text-primary">{{ $t('positions.matches') }}</th>
            <th class="py-3 px-2 sm:px-4 text-center text-xs sm:text-sm font-semibold text-primary w-16 sm:w-auto">{{ $t('positions.points') }}</th>
            <th class="py-3 px-2 sm:px-4 w-6"></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="entry in rankings" :key="entry.entryId">
            <tr
              :class="[
                'border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer',
                isCurrentUser(entry.userId) ? 'bg-accent/10' : ''
              ]"
              @click="toggleEntry(entry.entryId)"
            >
            <td class="py-3 px-2 sm:px-4">
              <span :class="[
                'inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full font-bold text-xs sm:text-sm',
                entry.rank === 1 ? 'bg-accent text-primary-dark' :
                entry.rank === 2 ? 'bg-gray-300 text-gray-700' :
                entry.rank === 3 ? 'bg-orange-200 text-orange-800' :
                'bg-gray-100 text-gray-600'
              ]">
                {{ entry.rank }}
              </span>
            </td>
            <td class="py-3 px-2 sm:px-4 min-w-0">
              <div class="flex items-center gap-2 sm:gap-3 min-w-0">
                <img
                  v-if="avatarUrl(entry.profilePicture)"
                  :src="avatarUrl(entry.profilePicture)!"
                  class="hidden sm:block w-10 h-10 rounded-full object-cover shrink-0"
                />
                <div v-else class="hidden sm:flex w-10 h-10 rounded-full bg-primary items-center justify-center text-white font-bold text-sm shrink-0">
                  {{ entry.firstName[0] }}{{ entry.lastName[0] }}
                </div>
                <div class="min-w-0">
                  <p class="font-medium text-gray-800 text-sm truncate">
                    {{ entry.firstName }} {{ entry.lastName }}
                    <span class="sm:hidden text-xs text-gray-500 font-normal">· #{{ entry.entryNumber }}</span>
                  </p>
                  <p class="hidden sm:block text-xs text-gray-400 truncate">{{ entry.email }}</p>
                </div>
              </div>
            </td>
            <td class="hidden sm:table-cell py-3 px-4 text-center text-gray-600">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                #{{ entry.entryNumber }}
              </span>
            </td>
            <td class="hidden md:table-cell py-3 px-4 text-center text-gray-600">{{ entry.matchesScored }}</td>
            <td class="py-3 px-2 sm:px-4 text-center">
              <span class="font-bold text-base sm:text-lg text-primary">{{ entry.totalPoints }}</span>
            </td>
            <td class="py-3 px-1 sm:px-4 text-center text-gray-400 text-xs">
              {{ expandedEntryId === entry.entryId ? '▲' : '▼' }}
            </td>
            </tr>
            <tr v-if="expandedEntryId === entry.entryId" class="bg-gray-50">
              <td colspan="6" class="px-2 sm:px-4 py-3 sm:py-4">
                <div v-if="entryDetailsLoading" class="text-sm text-gray-500 text-center py-4">
                  {{ $t('positions.loadingDetails') }}
                </div>
                <div v-else-if="entryDetails && entryDetails.predictions.length === 0" class="text-sm text-gray-400 text-center py-4">
                  {{ $t('positions.noPredictionsYet') }}
                </div>
                <ul v-else-if="entryDetails" class="divide-y divide-gray-200 sm:divide-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-2 bg-white rounded-lg sm:bg-transparent">
                  <li
                    v-for="p in entryDetails.predictions"
                    :key="p._id"
                    class="px-3 py-2 text-xs flex items-center gap-2 sm:border sm:border-gray-200 sm:rounded-lg sm:bg-white"
                  >
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-gray-700 truncate">
                        {{ matchLabel(p.match) }}
                      </p>
                      <p v-if="matchIsFinished(p.match)" class="text-[10px] text-gray-400 truncate">
                        {{ $t('positions.result') }}: {{ (p.match as any).score1 }}-{{ (p.match as any).score2 }}
                      </p>
                    </div>
                    <span class="font-bold text-sm text-primary tabular-nums shrink-0">
                      {{ p.score1 }}-{{ p.score2 }}
                    </span>
                    <span v-if="p.points != null" :class="[
                      'inline-flex items-center justify-center min-w-[1.75rem] h-5 px-1 rounded text-[10px] font-bold shrink-0',
                      p.points === 3 ? 'bg-accent/20 text-accent-dark' :
                      p.points === 1 ? 'bg-blue-50 text-blue-700' :
                      'bg-red-50 text-red-500'
                    ]">
                      +{{ p.points }}
                    </span>
                  </li>
                </ul>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LeaderboardEntry, Prediction, Match } from '~/types'

interface EntryDetail {
  entry: { _id: string; entryNumber: number; status: string; paymentStatus: string }
  user: { _id: string; firstName: string; lastName: string; profilePicture: string | null } | null
  predictions: Prediction[]
}

definePageMeta({ middleware: 'auth' })

const authStore = useAuthStore()
const entriesStore = useEntriesStore()
const { apiFetch } = useApi()
const { avatarUrl } = useAvatar()
const rankings = ref<LeaderboardEntry[]>([])
const loading = ref(true)
const expandedEntryId = ref<string | null>(null)
const entryDetails = ref<EntryDetail | null>(null)
const entryDetailsLoading = ref(false)

const hasUnlockedAccess = computed(() => {
  if (authStore.isAdmin) return true
  return entriesStore.entries.some((e) => e.paymentStatus === 'confirmed')
})

function isCurrentUser(userId: string): boolean {
  const user = authStore.user
  return user?.id === userId || user?._id === userId
}

function matchLabel(match: Match | string): string {
  if (typeof match === 'string') return match
  const team1 = match.team1?.code || match.team1?.name || match.team1Placeholder || '?'
  const team2 = match.team2?.code || match.team2?.name || match.team2Placeholder || '?'
  return `${team1} vs ${team2}`
}

function matchIsFinished(match: Match | string): boolean {
  return typeof match !== 'string' && match.status === 'finished'
}

async function toggleEntry(entryId: string) {
  if (expandedEntryId.value === entryId) {
    expandedEntryId.value = null
    entryDetails.value = null
    return
  }
  expandedEntryId.value = entryId
  entryDetails.value = null
  entryDetailsLoading.value = true
  try {
    entryDetails.value = await apiFetch<EntryDetail>(
      `/api/leaderboard/entries/${entryId}/predictions`,
    )
  } finally {
    entryDetailsLoading.value = false
  }
}

onMounted(async () => {
  try {
    await entriesStore.fetchMine()
    if (hasUnlockedAccess.value) {
      rankings.value = await apiFetch<LeaderboardEntry[]>('/api/leaderboard')
    }
  } finally {
    loading.value = false
  }
})
</script>
