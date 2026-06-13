<template>
  <div>
    <NuxtLink to="/matches" class="text-sm text-gray-500 hover:text-primary inline-flex items-center gap-1 mb-4">
      ← {{ $t('matches.backToMatches') }}
    </NuxtLink>

    <div v-if="loading" class="text-center py-12 text-gray-500">
      {{ $t('matches.loading') }}
    </div>

    <template v-else-if="match">
      <!-- Match summary card -->
      <div class="card mb-6 flex flex-col sm:flex-row items-center gap-4">
        <div class="flex-1 flex items-center justify-center sm:justify-end gap-3">
          <div class="text-center sm:text-right">
            <p class="font-bold text-primary text-lg">
              {{ match.team1?.name || match.team1Placeholder || 'TBD' }}
            </p>
            <p v-if="match.team1?.code" class="text-xs text-gray-400">{{ match.team1.code }}</p>
          </div>
          <img
            v-if="match.team1?.flagUrl"
            :src="match.team1.flagUrl"
            :alt="match.team1.name"
            class="w-14 h-10 object-cover rounded shadow"
          />
        </div>

        <div class="flex flex-col items-center min-w-[120px]">
          <template v-if="match.status === 'finished'">
            <p
              v-if="match.live"
              class="text-[10px] uppercase tracking-wider text-amber-600 font-semibold flex items-center gap-1"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              {{ $t('matches.live') }}
            </p>
            <p v-else class="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{{ $t('matches.result') }}</p>
            <div class="flex items-center gap-2 mt-1">
              <span class="w-12 h-12 flex items-center justify-center text-2xl font-bold bg-primary-dark text-white rounded-lg">
                {{ match.score1 }}
              </span>
              <span class="text-gray-300 font-bold">-</span>
              <span class="w-12 h-12 flex items-center justify-center text-2xl font-bold bg-primary-dark text-white rounded-lg">
                {{ match.score2 }}
              </span>
            </div>
          </template>
          <template v-else>
            <span class="text-gray-400 font-bold text-2xl">vs</span>
            <span class="text-[10px] uppercase text-gray-400 mt-1">{{ $t('matches.scheduled') }}</span>
          </template>
        </div>

        <div class="flex-1 flex items-center justify-center sm:justify-start gap-3">
          <img
            v-if="match.team2?.flagUrl"
            :src="match.team2.flagUrl"
            :alt="match.team2.name"
            class="w-14 h-10 object-cover rounded shadow"
          />
          <div class="text-center sm:text-left">
            <p class="font-bold text-primary text-lg">
              {{ match.team2?.name || match.team2Placeholder || 'TBD' }}
            </p>
            <p v-if="match.team2?.code" class="text-xs text-gray-400">{{ match.team2.code }}</p>
          </div>
        </div>
      </div>

      <div class="text-center text-sm text-gray-500 mb-6">
        {{ formatDate(match.date) }}
        <template v-if="match.venue"> · {{ match.venue }}</template>
        <template v-if="match.group"> · {{ match.group.name }}</template>
      </div>

      <!-- Community sentiment -->
      <div class="card mb-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold text-primary">
            {{ $t('matches.communityTitle') }}
          </h2>
          <span v-if="sentiment.total" class="text-xs text-gray-400">
            {{ $t('matches.predictionsCount', { count: sentiment.total }) }}
          </span>
        </div>
        <PredictionSentimentBar
          :team1="sentiment.team1"
          :draw="sentiment.draw"
          :team2="sentiment.team2"
          :team1-label="teamLabel(1)"
          :team2-label="teamLabel(2)"
          :draw-label="$t('matches.draw')"
          :empty-label="$t('matches.communityEmpty')"
        />
      </div>

      <!-- Predictions table -->
      <div class="card">
        <h2 class="text-lg font-semibold text-primary mb-4">
          {{ $t('matches.predictionsTitle') }}
        </h2>
        <div v-if="predictions.length === 0" class="text-center text-gray-400 text-sm py-6">
          {{ $t('matches.noPredictions') }}
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200">
                <th class="text-left py-2 px-3 font-semibold text-gray-600">{{ $t('matches.playerColumn') }}</th>
                <th class="text-center py-2 px-3 font-semibold text-gray-600">{{ $t('matches.entryColumn') }}</th>
                <th class="text-center py-2 px-3 font-semibold text-gray-600">{{ $t('matches.predictionColumn') }}</th>
                <th class="text-center py-2 px-3 font-semibold text-gray-600">{{ $t('matches.pointsColumn') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in predictions"
                :key="p._id"
                class="border-b border-gray-100"
              >
                <td class="py-2 px-3">
                  <div class="flex items-center gap-2">
                    <img
                      v-if="avatarUrl(p.user.profilePicture)"
                      :src="avatarUrl(p.user.profilePicture)!"
                      class="w-8 h-8 rounded-full object-cover"
                    />
                    <div v-else class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs">
                      {{ p.user.firstName[0] }}{{ p.user.lastName[0] }}
                    </div>
                    <span class="font-medium text-gray-700">{{ p.user.firstName }} {{ p.user.lastName }}</span>
                  </div>
                </td>
                <td class="text-center py-2 px-3">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    #{{ p.entryNumber }}
                  </span>
                </td>
                <td class="text-center py-2 px-3 font-bold text-primary tabular-nums">
                  {{ p.score1 }} - {{ p.score2 }}
                </td>
                <td class="text-center py-2 px-3">
                  <span v-if="p.points != null" :class="[
                    'inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold',
                    p.points === 3 ? 'bg-accent/20 text-accent-dark' :
                    p.points === 1 ? 'bg-blue-50 text-blue-700' :
                    'bg-red-50 text-red-500'
                  ]">
                    {{ p.points }}
                  </span>
                  <span v-else class="text-gray-300 text-xs">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Match } from '~/types'

definePageMeta({ middleware: 'auth' })

interface MatchPrediction {
  _id: string
  score1: number
  score2: number
  points: number | null
  entryId: string | null
  entryNumber: number | null
  user: {
    _id: string
    firstName: string
    lastName: string
    profilePicture: string | null
  }
}

const route = useRoute()
const { apiFetch } = useApi()
const { avatarUrl } = useAvatar()
const match = ref<Match | null>(null)
const predictions = ref<MatchPrediction[]>([])
const loading = ref(true)

const sentiment = computed(() => {
  const s = { team1: 0, draw: 0, team2: 0, total: 0 }
  for (const p of predictions.value) {
    if (p.score1 > p.score2) s.team1++
    else if (p.score1 < p.score2) s.team2++
    else s.draw++
    s.total++
  }
  return s
})

function teamLabel(which: 1 | 2): string {
  const m = match.value
  if (!m) return which === 1 ? 'T1' : 'T2'
  const team = which === 1 ? m.team1 : m.team2
  const placeholder = which === 1 ? m.team1Placeholder : m.team2Placeholder
  return team?.code || team?.name || placeholder || (which === 1 ? 'T1' : 'T2')
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function loadMatch() {
  const matchId = route.params.id as string
  const [m, preds] = await Promise.all([
    apiFetch<Match>(`/api/matches/${matchId}`),
    apiFetch<MatchPrediction[]>(`/api/predictions/match/${matchId}`),
  ])
  match.value = m
  predictions.value = [...preds].sort((a, b) => {
    const pa = a.points ?? -1
    const pb = b.points ?? -1
    return pb - pa
  })
}

onMounted(async () => {
  try {
    await loadMatch()
  } finally {
    loading.value = false
  }
})

// Keep the score (and points, which recalculate live) fresh in the background.
useLivePolling(() => loadMatch(), {
  isLive: () => match.value?.live === true,
})
</script>
