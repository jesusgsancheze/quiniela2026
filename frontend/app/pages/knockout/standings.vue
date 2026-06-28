<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <h1 class="text-3xl font-bold text-primary">{{ $t('knockout.standingsTitle') }}</h1>
      <NuxtLink to="/knockout" class="btn-secondary text-sm px-4 py-2 self-start">
        {{ $t('knockout.backToBracket') }}
      </NuxtLink>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-500">{{ $t('positions.loading') }}</div>

    <div v-else-if="rankings.length === 0" class="card text-center py-12">
      <p class="text-gray-500 text-lg">{{ $t('positions.noResults') }}</p>
    </div>

    <div v-else class="card overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b-2 border-primary">
            <th class="py-3 px-2 sm:px-4 text-center text-xs sm:text-sm font-semibold text-primary w-12">#</th>
            <th class="py-3 px-2 sm:px-4 text-left text-xs sm:text-sm font-semibold text-primary">{{ $t('positions.player') }}</th>
            <th class="hidden sm:table-cell py-3 px-4 text-center text-sm font-semibold text-primary">{{ $t('positions.entry') }}</th>
            <th class="hidden md:table-cell py-3 px-4 text-center text-sm font-semibold text-primary">{{ $t('positions.matches') }}</th>
            <th class="hidden md:table-cell py-3 px-4 text-center text-sm font-semibold text-primary">{{ $t('positions.exact') }}</th>
            <th class="hidden md:table-cell py-3 px-4 text-center text-sm font-semibold text-primary">{{ $t('positions.correct') }}</th>
            <th class="py-3 px-2 sm:px-4 text-center text-xs sm:text-sm font-semibold text-primary">{{ $t('positions.points') }}</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="entry in rankings" :key="entry.entryId">
          <tr class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" @click="toggleEntry(entry.entryId)">
            <td class="py-3 px-2 sm:px-4 text-center">
              <span
                class="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
                :class="entry.rank === 1 ? 'bg-accent text-primary-dark' :
                  entry.rank === 2 ? 'bg-gray-300 text-gray-700' :
                  entry.rank === 3 ? 'bg-orange-200 text-orange-800' : 'text-gray-500'"
              >
                {{ entry.rank }}
              </span>
            </td>
            <td class="py-3 px-2 sm:px-4">
              <div class="flex items-center gap-3">
                <img
                  v-if="avatarUrl(entry.profilePicture)"
                  :src="avatarUrl(entry.profilePicture)!"
                  class="hidden sm:block w-10 h-10 rounded-full object-cover"
                />
                <div v-else class="hidden sm:flex w-10 h-10 rounded-full bg-primary items-center justify-center text-white font-bold text-sm shrink-0">
                  {{ entry.firstName[0] }}{{ entry.lastName[0] }}
                </div>
                <div class="min-w-0">
                  <p class="font-medium text-gray-800 text-sm truncate">
                    {{ entry.firstName }} {{ entry.lastName }}
                    <span class="sm:hidden text-xs text-gray-500 font-normal">· #{{ entry.entryNumber }}</span>
                  </p>
                  <p class="hidden sm:block text-xs text-gray-400 truncate">{{ maskEmail(entry.email) }}</p>
                </div>
              </div>
            </td>
            <td class="hidden sm:table-cell py-3 px-4 text-center text-gray-600">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">#{{ entry.entryNumber }}</span>
            </td>
            <td class="hidden md:table-cell py-3 px-4 text-center text-gray-600 text-sm">{{ entry.matchesScored }}</td>
            <td class="hidden md:table-cell py-3 px-4 text-center">
              <span class="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">{{ entry.exactCount ?? 0 }}</span>
            </td>
            <td class="hidden md:table-cell py-3 px-4 text-center">
              <span class="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">{{ entry.correctCount ?? 0 }}</span>
            </td>
            <td class="py-3 px-2 sm:px-4 text-center font-bold text-primary">{{ entry.totalPoints }}</td>
          </tr>
          <tr v-if="expandedEntryId === entry.entryId" class="bg-gray-50">
            <td colspan="7" class="px-2 sm:px-4 py-3">
              <div v-if="detailsLoading" class="text-sm text-gray-500 text-center py-3">{{ $t('positions.loadingDetails') }}</div>
              <div v-else-if="details && details.predictions.length === 0" class="text-sm text-gray-400 text-center py-3">{{ $t('positions.noPredictionsYet') }}</div>
              <ul v-else-if="details" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <li v-for="(p, i) in details.predictions" :key="i" class="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-gray-500 truncate">{{ stageLabel(p.stage) }}</span>
                    <span v-if="p.points != null" class="font-semibold shrink-0" :class="badge(p.result)">+{{ p.points }}</span>
                  </div>
                  <div class="flex items-center justify-between gap-2 mt-1">
                    <span class="truncate text-primary">{{ slotLabel(p, 'team1') }} <b class="tabular-nums">{{ p.score1 }}</b></span>
                    <span class="text-gray-300">-</span>
                    <span class="truncate text-primary text-right"><b class="tabular-nums">{{ p.score2 }}</b> {{ slotLabel(p, 'team2') }}</span>
                  </div>
                  <p class="text-[10px] text-gray-400 mt-1">
                    {{ $t('knockout.advancesLabel', { team: p.advancesTeam?.code || p.advancesTeam?.name || (p.advances === 'team1' ? slotLabel(p, 'team1') : slotLabel(p, 'team2')) }) }}
                    <span v-if="p.status === 'finished' && p.actualScore1 != null" class="ml-1 text-gray-500">· {{ $t('positions.result') }} {{ p.actualScore1 }}-{{ p.actualScore2 }}</span>
                  </p>
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
import type { LeaderboardEntry, KnockoutEntryPredictionRow } from '~/types'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const { apiFetch } = useApi()
const { avatarUrl } = useAvatar()
const rankings = ref<LeaderboardEntry[]>([])
const loading = ref(true)

const expandedEntryId = ref<string | null>(null)
const details = ref<{ predictions: KnockoutEntryPredictionRow[] } | null>(null)
const detailsLoading = ref(false)

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    round32: t('matches.stageRoundOf32'), round16: t('matches.stageRoundOf16'),
    quarter: t('matches.stageQuarter'), semi: t('matches.stageSemi'),
    third: t('matches.stageThird'), final: t('matches.stageFinal'),
  }
  return map[stage] || stage
}
function slotLabel(p: KnockoutEntryPredictionRow, side: 'team1' | 'team2'): string {
  const tm = side === 'team1' ? p.team1 : p.team2
  return tm?.code || tm?.name || (side === 'team1' ? p.placeholder1 : p.placeholder2) || '?'
}
function badge(result: string | null): string {
  if (result === 'exact') return 'text-green-600'
  if (result === 'correct') return 'text-blue-600'
  return 'text-gray-400'
}

async function toggleEntry(entryId: string) {
  if (expandedEntryId.value === entryId) {
    expandedEntryId.value = null
    details.value = null
    return
  }
  expandedEntryId.value = entryId
  details.value = null
  detailsLoading.value = true
  try {
    details.value = await apiFetch<{ predictions: KnockoutEntryPredictionRow[] }>(`/api/knockout/entries/${entryId}/predictions`)
  } finally {
    detailsLoading.value = false
  }
}

function maskEmail(email?: string | null): string {
  if (!email) return ''
  const [local, domain] = email.split('@')
  if (!domain) return email
  let maskedLocal: string
  if (local.length <= 4) {
    maskedLocal = local[0] + '*'.repeat(Math.max(local.length - 1, 1))
  } else {
    maskedLocal = local.slice(0, 2) + '*'.repeat(local.length - 4) + local.slice(-2)
  }
  return `${maskedLocal}@${'*'.repeat(domain.length)}`
}

onMounted(async () => {
  try {
    rankings.value = await apiFetch<LeaderboardEntry[]>('/api/knockout/leaderboard')
  } finally {
    loading.value = false
  }
})
</script>
