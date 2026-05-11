<template>
  <div>
    <h1 class="text-3xl font-bold text-primary mb-6">{{ $t('matches.title') }}</h1>

    <div v-if="loading" class="text-center py-12 text-gray-500">
      {{ $t('matches.loading') }}
    </div>

    <div v-else class="space-y-8">
      <div v-for="(matches, label) in groupedMatches" :key="label">
        <h2 class="text-lg font-semibold text-primary-dark mb-3 border-b-2 border-accent pb-2">
          {{ label }}
        </h2>
        <div class="space-y-2">
          <NuxtLink
            v-for="match in matches"
            :key="match._id"
            :to="`/matches/${match._id}`"
            class="card flex items-center gap-3 hover:bg-gray-50 transition-colors"
          >
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
                <span class="text-[10px] uppercase text-green-600 font-semibold mt-0.5">
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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(async () => {
  try {
    await matchesStore.fetchMatches()
  } finally {
    loading.value = false
  }
})
</script>
