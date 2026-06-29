<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <h1 class="text-3xl font-bold text-primary">{{ $t('knockoutDraw.title') }}</h1>
      <NuxtLink v-if="authStore.isAuthenticated" to="/knockout/matches" class="btn-secondary text-sm px-4 py-2 self-start">
        {{ $t('knockoutDraw.viewMatches') }}
      </NuxtLink>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-500">{{ $t('knockout.loading') }}</div>
    <BracketDiagram v-else :matches="drawMatches" />
  </div>
</template>

<script setup lang="ts">
import type { KnockoutPublicMatch, DrawMatch } from '~/types'

// Public page — no auth middleware so it can be shared without a session.
const { t } = useI18n()
const { apiFetch } = useApi()
const authStore = useAuthStore()
const raw = ref<KnockoutPublicMatch[]>([])
const loading = ref(true)

function actualWinner(m: KnockoutPublicMatch): 'team1' | 'team2' | null {
  if (m.status !== 'finished' || m.live || m.score1 == null || m.score2 == null) return null
  if (m.score1 > m.score2) return 'team1'
  if (m.score1 < m.score2) return 'team2'
  return m.decidedOnPenalties ? m.penaltyWinner : null
}
function pkLabel(m: KnockoutPublicMatch): string {
  const tm = m.penaltyWinner === 'team1' ? m.team1 : m.team2
  return t('knockout.wonOnPens', { team: tm?.code || tm?.name || '' })
}

const drawMatches = computed<DrawMatch[]>(() =>
  raw.value.map((m) => ({
    matchNumber: m.matchNumber,
    stage: m.stage,
    date: m.date,
    venue: m.venue,
    placeholder1: m.placeholder1,
    placeholder2: m.placeholder2,
    team1: m.team1,
    team2: m.team2,
    score1: m.status === 'finished' ? m.score1 : null,
    score2: m.status === 'finished' ? m.score2 : null,
    winnerSide: actualWinner(m),
    note: m.decidedOnPenalties ? pkLabel(m) : null,
  })),
)

onMounted(async () => {
  authStore.loadFromStorage()
  try {
    raw.value = await apiFetch<KnockoutPublicMatch[]>('/api/knockout/public/draw')
  } finally {
    loading.value = false
  }
})
</script>
