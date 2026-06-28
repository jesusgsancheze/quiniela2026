<template>
  <div>
    <NuxtLink to="/knockout/matches" class="text-sm text-primary hover:underline">← {{ $t('knockoutMatches.back') }}</NuxtLink>

    <div v-if="loading" class="text-center py-12 text-gray-500 mt-4">{{ $t('knockout.loading') }}</div>
    <div v-else-if="!detail?.match" class="text-center py-12 text-gray-400 mt-4">{{ $t('knockoutMatches.notFound') }}</div>

    <div v-else class="mt-4">
      <!-- Match header -->
      <div class="card mb-6">
        <p class="text-xs uppercase tracking-wider text-gray-400 mb-3 text-center">{{ stageLabel(detail.match.stage) }} · {{ detail.match.round }}</p>
        <div class="flex items-center justify-center gap-4">
          <div class="flex flex-col items-center gap-1 flex-1 min-w-0">
            <img v-if="detail.match.team1?.flagUrl" :src="detail.match.team1.flagUrl" class="w-12 h-9 object-cover rounded shadow-sm" />
            <span class="font-semibold text-primary text-center truncate w-full">{{ teamName('team1') }}</span>
          </div>
          <div class="flex flex-col items-center min-w-[90px]">
            <template v-if="detail.match.status === 'finished'">
              <div class="flex items-center gap-2">
                <span class="w-10 h-10 flex items-center justify-center text-lg font-bold bg-primary-dark text-white rounded">{{ detail.match.score1 }}</span>
                <span class="text-gray-300">-</span>
                <span class="w-10 h-10 flex items-center justify-center text-lg font-bold bg-primary-dark text-white rounded">{{ detail.match.score2 }}</span>
              </div>
              <span v-if="detail.match.live" class="text-[11px] uppercase text-amber-600 font-semibold mt-1 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>{{ $t('matches.live') }}
              </span>
              <span v-else-if="detail.match.decidedOnPenalties" class="text-[11px] uppercase text-gray-500 font-semibold mt-1">{{ pkLabel() }}</span>
              <span v-else class="text-[11px] uppercase text-green-600 font-semibold mt-1">{{ $t('matches.finished') }}</span>
            </template>
            <template v-else>
              <span class="text-gray-400 font-bold text-lg">vs</span>
              <span class="text-[11px] uppercase text-gray-400 mt-1">{{ $t('matches.scheduled') }}</span>
            </template>
          </div>
          <div class="flex flex-col items-center gap-1 flex-1 min-w-0">
            <img v-if="detail.match.team2?.flagUrl" :src="detail.match.team2.flagUrl" class="w-12 h-9 object-cover rounded shadow-sm" />
            <span class="font-semibold text-primary text-center truncate w-full">{{ teamName('team2') }}</span>
          </div>
        </div>
        <div class="flex items-center justify-center gap-4 mt-4 text-xs text-gray-400">
          <span>{{ formatDate(detail.match.date) }}</span>
          <span v-if="detail.match.venue">· {{ detail.match.venue }}</span>
        </div>
      </div>

      <!-- Predictions -->
      <h2 class="text-lg font-semibold text-primary mb-3">{{ $t('knockoutMatches.allPicks') }}</h2>
      <div v-if="detail.predictions.length === 0" class="card text-center py-8 text-gray-400">{{ $t('knockoutMatches.noPicks') }}</div>
      <div v-else class="card overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b-2 border-primary text-left">
              <th class="py-2 px-2 sm:px-3 font-semibold text-primary">{{ $t('positions.player') }}</th>
              <th class="py-2 px-2 sm:px-3 text-center font-semibold text-primary">{{ $t('knockoutMatches.pick') }}</th>
              <th class="py-2 px-2 sm:px-3 text-left font-semibold text-primary">{{ $t('knockoutMatches.advances') }}</th>
              <th class="py-2 px-2 sm:px-3 text-center font-semibold text-primary">{{ $t('positions.points') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in detail.predictions" :key="p._id" class="border-b border-gray-100">
              <td class="py-2 px-2 sm:px-3">
                <div class="flex items-center gap-2 min-w-0">
                  <img v-if="avatarUrl(p.user.profilePicture)" :src="avatarUrl(p.user.profilePicture)!" class="hidden sm:block w-8 h-8 rounded-full object-cover" />
                  <div v-else class="hidden sm:flex w-8 h-8 rounded-full bg-primary items-center justify-center text-white font-bold text-[11px] shrink-0">
                    {{ p.user.firstName[0] }}{{ p.user.lastName[0] }}
                  </div>
                  <span class="truncate text-gray-800">{{ p.user.firstName }} {{ p.user.lastName }}</span>
                  <span v-if="p.entryNumber" class="text-[11px] text-gray-400">#{{ p.entryNumber }}</span>
                </div>
              </td>
              <td class="py-2 px-2 sm:px-3 text-center font-semibold tabular-nums">{{ p.score1 }}-{{ p.score2 }}</td>
              <td class="py-2 px-2 sm:px-3 text-gray-600 truncate">{{ p.advancesTeam?.name || (p.advances === 'team1' ? teamName('team1') : teamName('team2')) }}</td>
              <td class="py-2 px-2 sm:px-3 text-center">
                <span v-if="p.points != null" class="font-semibold" :class="badge(p.result)">+{{ p.points }}</span>
                <span v-else class="text-gray-300">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { KnockoutMatchDetail } from '~/types'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const route = useRoute()
const { apiFetch } = useApi()
const { avatarUrl } = useAvatar()
const detail = ref<KnockoutMatchDetail | null>(null)
const loading = ref(true)

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    round32: t('matches.stageRoundOf32'), round16: t('matches.stageRoundOf16'),
    quarter: t('matches.stageQuarter'), semi: t('matches.stageSemi'),
    third: t('matches.stageThird'), final: t('matches.stageFinal'),
  }
  return map[stage] || stage
}
function teamName(side: 'team1' | 'team2'): string {
  const m = detail.value?.match
  if (!m) return 'TBD'
  const tm = side === 'team1' ? m.team1 : m.team2
  return tm?.name || (side === 'team1' ? m.placeholder1 : m.placeholder2) || 'TBD'
}
function pkLabel(): string {
  const m = detail.value?.match
  if (!m) return ''
  const tm = m.penaltyWinner === 'team1' ? m.team1 : m.team2
  return t('knockout.wonOnPens', { team: tm?.code || tm?.name || '' })
}
function badge(result: string | null): string {
  if (result === 'exact') return 'text-green-600'
  if (result === 'correct') return 'text-blue-600'
  return 'text-gray-400'
}
function formatDate(s: string): string {
  return new Date(s).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  try {
    detail.value = await apiFetch<KnockoutMatchDetail>(`/api/knockout/matches/${route.params.id}/predictions`)
  } finally {
    loading.value = false
  }
})
</script>
