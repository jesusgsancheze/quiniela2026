<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <h1 class="text-3xl font-bold text-primary">{{ $t('matches.title') }}</h1>
      <div class="inline-flex self-start rounded-lg border border-gray-200 p-0.5 bg-gray-50">
        <button
          type="button"
          class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
          :class="viewMode === 'group' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-primary'"
          @click="viewMode = 'group'"
        >
          {{ $t('matches.viewByGroup') }}
        </button>
        <button
          type="button"
          class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
          :class="viewMode === 'date' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-primary'"
          @click="viewMode = 'date'"
        >
          {{ $t('matches.viewByDate') }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-500">
      {{ $t('matches.loading') }}
    </div>

    <div v-else class="space-y-8">
      <div v-for="(matches, label) in displayGroups" :key="label">
        <h2 class="text-lg font-semibold text-primary-dark mb-3 border-b-2 border-accent pb-2">
          {{ label }}
        </h2>
        <div class="space-y-2">
          <NuxtLink
            v-for="match in matches"
            :key="match._id"
            :to="`/matches/${match._id}`"
            class="card block hover:bg-gray-50 transition-colors"
          >
            <div class="flex items-center gap-3">
            <div class="flex-1 flex items-center justify-end gap-2 min-w-0">
              <span class="font-medium text-primary truncate text-right">
                {{ match.team1?.name || match.team1Placeholder || 'TBD' }}
              </span>
              <img
                v-if="match.team1?.flagUrl"
                :src="match.team1.flagUrl"
                :alt="match.team1.name"
                class="w-8 h-6 object-cover rounded shadow-sm"
              />
            </div>

            <div class="flex flex-col items-center min-w-[80px]">
              <template v-if="match.status === 'finished'">
                <div class="flex items-center gap-1.5">
                  <span class="w-8 h-8 flex items-center justify-center text-sm font-bold bg-primary-dark text-white rounded">
                    {{ match.score1 }}
                  </span>
                  <span class="text-gray-300 text-xs">-</span>
                  <span class="w-8 h-8 flex items-center justify-center text-sm font-bold bg-primary-dark text-white rounded">
                    {{ match.score2 }}
                  </span>
                </div>
                <span
                  v-if="match.live"
                  class="text-[10px] uppercase text-amber-600 font-semibold mt-0.5 flex items-center gap-1"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  {{ $t('matches.live') }}
                </span>
                <span v-else class="text-[10px] uppercase text-green-600 font-semibold mt-0.5">
                  {{ $t('matches.finished') }}
                </span>
              </template>
              <template v-else>
                <span class="text-gray-400 font-bold">vs</span>
                <span class="text-[10px] uppercase text-gray-400 mt-0.5">
                  {{ $t('matches.scheduled') }}
                </span>
              </template>
            </div>

            <div class="flex-1 flex items-center justify-start gap-2 min-w-0">
              <img
                v-if="match.team2?.flagUrl"
                :src="match.team2.flagUrl"
                :alt="match.team2.name"
                class="w-8 h-6 object-cover rounded shadow-sm"
              />
              <span class="font-medium text-primary truncate">
                {{ match.team2?.name || match.team2Placeholder || 'TBD' }}
              </span>
            </div>

            <div class="hidden sm:flex flex-col items-end text-xs text-gray-400 ml-2">
              <span>{{ formatDate(match.date) }}</span>
              <span v-if="match.venue" class="truncate max-w-[140px]">{{ match.venue }}</span>
            </div>
            </div>

            <div class="mt-2 pt-2 border-t border-gray-100">
              <p class="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                {{ $t('matches.communityTitle') }}
                <span v-if="statFor(match._id).total" class="normal-case tracking-normal">
                  · {{ $t('matches.predictionsCount', { count: statFor(match._id).total }) }}
                </span>
              </p>
              <PredictionSentimentBar
                :team1="statFor(match._id).team1"
                :draw="statFor(match._id).draw"
                :team2="statFor(match._id).team2"
                :team1-label="teamLabel(match, 1)"
                :team2-label="teamLabel(match, 2)"
                :draw-label="$t('matches.draw')"
                :empty-label="$t('matches.communityEmpty')"
              />
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Match } from '~/types'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const matchesStore = useMatchesStore()
const loading = ref(true)
const viewMode = ref<'group' | 'date'>('group')

const stageLabels: Record<string, string> = {
  group: t('matches.stageGroup'),
  roundOf32: t('matches.stageRoundOf32'),
  roundOf16: t('matches.stageRoundOf16'),
  quarter: t('matches.stageQuarter'),
  semi: t('matches.stageSemi'),
  final: t('matches.stageFinal'),
  third: t('matches.stageThird'),
}

const groupedMatches = computed(() => {
  const result: Record<string, Match[]> = {}
  const groupOrder: Record<string, number> = {
    group: 0, roundOf32: 1, roundOf16: 2, quarter: 3, semi: 4, third: 5, final: 6,
  }
  const sorted = [...matchesStore.matches].sort((a, b) => {
    const sa = groupOrder[a.stage] ?? 99
    const sb = groupOrder[b.stage] ?? 99
    if (sa !== sb) return sa - sb
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })
  for (const m of sorted) {
    const stageLabel = stageLabels[m.stage] || m.stage
    const key = m.stage === 'group' && m.group?.name
      ? `${stageLabel} — ${m.group.name}`
      : stageLabel
    if (!result[key]) result[key] = []
    result[key].push(m)
  }
  return result
})

const matchesByDate = computed(() => {
  const result: Record<string, Match[]> = {}
  const sorted = [...matchesStore.matches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
  for (const m of sorted) {
    const key = new Date(m.date).toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    if (!result[key]) result[key] = []
    result[key].push(m)
  }
  return result
})

const displayGroups = computed(() =>
  viewMode.value === 'date' ? matchesByDate.value : groupedMatches.value,
)

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const emptyStat = { team1: 0, draw: 0, team2: 0, total: 0 }
function statFor(matchId: string) {
  return matchesStore.predictionStats[matchId] || emptyStat
}

function teamLabel(match: Match, which: 1 | 2): string {
  const team = which === 1 ? match.team1 : match.team2
  const placeholder = which === 1 ? match.team1Placeholder : match.team2Placeholder
  return team?.code || team?.name || placeholder || (which === 1 ? 'T1' : 'T2')
}

onMounted(async () => {
  try {
    await Promise.all([
      matchesStore.fetchMatches(),
      matchesStore.fetchPredictionStats(),
    ])
  } finally {
    loading.value = false
  }
})

// Refresh scores in the background so live results appear without a reload.
// Polls quickly while a match is live, slowly otherwise; pauses when the tab
// is hidden.
useLivePolling(() => matchesStore.fetchMatches(undefined, { silent: true }), {
  isLive: () => matchesStore.hasLiveMatches,
})
</script>
