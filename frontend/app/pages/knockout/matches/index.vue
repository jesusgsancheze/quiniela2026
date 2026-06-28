<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <h1 class="text-3xl font-bold text-primary">{{ $t('knockoutMatches.title') }}</h1>
      <NuxtLink to="/knockout/draw" class="btn-secondary text-sm px-4 py-2 self-start">
        {{ $t('knockoutMatches.viewDraw') }}
      </NuxtLink>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-500">{{ $t('knockout.loading') }}</div>

    <div v-else class="space-y-8">
      <div v-for="stage in stageOrder" :key="stage">
        <template v-if="byStage(stage).length">
          <h2 class="text-lg font-semibold text-primary-dark mb-3 border-b-2 border-accent pb-2">{{ stageLabel(stage) }}</h2>
          <div class="space-y-2">
            <NuxtLink
              v-for="m in byStage(stage)"
              :key="m.matchId"
              :to="`/knockout/matches/${m.matchId}`"
              class="card block hover:bg-gray-50 transition-colors"
            >
              <div class="sm:hidden flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>{{ formatDate(m.date) }}</span>
                <span v-if="m.venue" class="truncate max-w-[55%] text-right">{{ m.venue }}</span>
              </div>

              <div class="flex items-center gap-3">
                <div class="flex-1 flex items-center justify-end gap-2 min-w-0">
                  <span class="font-medium text-primary truncate text-right">{{ teamName(m, 'team1') }}</span>
                  <img v-if="m.team1?.flagUrl" :src="m.team1.flagUrl" class="w-8 h-6 object-cover rounded shadow-sm" />
                </div>

                <div class="flex flex-col items-center min-w-[80px]">
                  <template v-if="m.status === 'finished'">
                    <div class="flex items-center gap-1.5">
                      <span class="w-8 h-8 flex items-center justify-center text-sm font-bold bg-primary-dark text-white rounded">{{ m.score1 }}</span>
                      <span class="text-gray-300 text-xs">-</span>
                      <span class="w-8 h-8 flex items-center justify-center text-sm font-bold bg-primary-dark text-white rounded">{{ m.score2 }}</span>
                    </div>
                    <span v-if="m.live" class="text-[10px] uppercase text-amber-600 font-semibold mt-0.5 flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>{{ $t('matches.live') }}
                    </span>
                    <span v-else-if="m.decidedOnPenalties" class="text-[10px] uppercase text-gray-500 font-semibold mt-0.5">{{ pkLabel(m) }}</span>
                    <span v-else class="text-[10px] uppercase text-green-600 font-semibold mt-0.5">{{ $t('matches.finished') }}</span>
                  </template>
                  <template v-else>
                    <span class="text-gray-400 font-bold">vs</span>
                    <span class="text-[10px] uppercase text-gray-400 mt-0.5">{{ $t('matches.scheduled') }}</span>
                  </template>
                </div>

                <div class="flex-1 flex items-center justify-start gap-2 min-w-0">
                  <img v-if="m.team2?.flagUrl" :src="m.team2.flagUrl" class="w-8 h-6 object-cover rounded shadow-sm" />
                  <span class="font-medium text-primary truncate">{{ teamName(m, 'team2') }}</span>
                </div>

                <div class="hidden sm:flex flex-col items-end text-xs text-gray-400 ml-2">
                  <span>{{ formatDate(m.date) }}</span>
                  <span v-if="m.venue" class="truncate max-w-[140px]">{{ m.venue }}</span>
                </div>
              </div>

              <!-- Community advance split -->
              <div class="mt-2 pt-2 border-t border-gray-100">
                <p class="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                  {{ $t('knockoutMatches.communityAdvances') }}
                  <span v-if="m.community.total" class="normal-case tracking-normal">· {{ $t('matches.predictionsCount', { count: m.community.total }) }}</span>
                </p>
                <AdvanceBar
                  :team1="m.community.team1"
                  :team2="m.community.team2"
                  :team1-label="shortName(m, 'team1')"
                  :team2-label="shortName(m, 'team2')"
                  :empty-label="$t('matches.communityEmpty')"
                />
              </div>
            </NuxtLink>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { KnockoutPublicMatch } from '~/types'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const { apiFetch } = useApi()
const matches = ref<KnockoutPublicMatch[]>([])
const loading = ref(true)

const stageOrder = ['round32', 'round16', 'quarter', 'semi', 'third', 'final']

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    round32: t('matches.stageRoundOf32'), round16: t('matches.stageRoundOf16'),
    quarter: t('matches.stageQuarter'), semi: t('matches.stageSemi'),
    third: t('matches.stageThird'), final: t('matches.stageFinal'),
  }
  return map[stage] || stage
}
function byStage(stage: string) {
  return matches.value.filter((m) => m.stage === stage).sort((a, b) => a.matchNumber - b.matchNumber)
}
function teamName(m: KnockoutPublicMatch, side: 'team1' | 'team2'): string {
  const tm = side === 'team1' ? m.team1 : m.team2
  return tm?.name || (side === 'team1' ? m.placeholder1 : m.placeholder2) || 'TBD'
}
function shortName(m: KnockoutPublicMatch, side: 'team1' | 'team2'): string {
  const tm = side === 'team1' ? m.team1 : m.team2
  return tm?.code || tm?.name || (side === 'team1' ? m.placeholder1 : m.placeholder2) || (side === 'team1' ? 'T1' : 'T2')
}
function pkLabel(m: KnockoutPublicMatch): string {
  const tm = m.penaltyWinner === 'team1' ? m.team1 : m.team2
  return t('knockout.wonOnPens', { team: tm?.code || tm?.name || '' })
}
function formatDate(s: string): string {
  return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  try {
    matches.value = await apiFetch<KnockoutPublicMatch[]>('/api/knockout/matches')
  } finally {
    loading.value = false
  }
})
</script>
