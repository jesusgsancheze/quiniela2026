<template>
  <div>
    <h1 class="text-3xl font-bold text-primary mb-6">{{ $t('predictions.title') }}</h1>

    <!-- Inactive warning -->
    <div v-if="!authStore.isActive && !authStore.isAdmin" class="bg-yellow-50 border border-yellow-200 text-yellow-800 px-6 py-4 rounded-xl mb-6">
      <p class="font-semibold">{{ $t('predictions.inactiveTitle') }}</p>
      <p class="text-sm">{{ $t('predictions.inactiveMessage') }}</p>
    </div>

    <!-- Progress bar -->
    <div v-if="predictionsStore.progress" class="card mb-6">
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm font-medium text-gray-600">{{ $t('predictions.progress') }}</span>
        <span class="text-sm font-bold text-accent">
          {{ predictionsStore.progress.filled }}/{{ predictionsStore.progress.total }} ({{ predictionsStore.progress.percentage }}%)
        </span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-3">
        <div class="bg-accent rounded-full h-3 transition-all duration-500" :style="{ width: `${predictionsStore.progress.percentage}%` }"></div>
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="flex gap-2 mb-6">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="activeTab = tab.value"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          activeTab === tab.value
            ? 'bg-primary text-white'
            : 'bg-white text-gray-600 hover:bg-gray-100'
        ]"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12 text-gray-500">
      {{ $t('predictions.loading') }}
    </div>

    <!-- Matches grouped by round/group -->
    <div v-else>
      <div v-for="(matches, groupName) in filteredGroupedMatches" :key="groupName" class="mb-8">
        <h2 class="text-lg font-semibold text-primary-dark mb-3 border-b-2 border-accent pb-2">
          {{ groupName }}
        </h2>
        <div class="space-y-3">
          <MatchCard
            v-for="match in matches"
            :key="match._id"
            :match="match"
            :prediction="getPrediction(match._id)"
            :can-edit="canEdit"
            @save="handleSave"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Match, Prediction } from '~/types'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const toast = useToast()
const authStore = useAuthStore()
const matchesStore = useMatchesStore()
const predictionsStore = usePredictionsStore()
const loading = ref(true)
const activeTab = ref('all')

const tabs = computed(() => [
  { value: 'all', label: t('predictions.allMatches') },
  { value: 'filled', label: t('predictions.filled') },
  { value: 'unfilled', label: t('predictions.unfilled') },
])

const canEdit = computed(() => {
  const deadline = new Date('2026-06-11T00:00:00Z')
  return (authStore.isActive || authStore.isAdmin) && new Date() < deadline
})

const predictionsMap = computed(() => {
  const map = new Map<string, Prediction>()
  predictionsStore.predictions.forEach((p) => {
    const matchId = typeof p.match === 'string' ? p.match : p.match._id
    map.set(matchId, p)
  })
  return map
})

function getPrediction(matchId: string): Prediction | undefined {
  return predictionsMap.value.get(matchId)
}

const filteredGroupedMatches = computed(() => {
  let matches = matchesStore.matches.filter((m) => m.stage === 'group')

  if (activeTab.value === 'filled') {
    matches = matches.filter((m) => predictionsMap.value.has(m._id))
  } else if (activeTab.value === 'unfilled') {
    matches = matches.filter((m) => !predictionsMap.value.has(m._id))
  }

  const groups: Record<string, Match[]> = {}
  matches.forEach((m) => {
    const key = m.stage === 'group' ? (m.group?.name || 'Group') : m.round
    if (!groups[key]) groups[key] = []
    groups[key].push(m)
  })
  return groups
})

async function handleSave(data: { matchId: string; score1: number; score2: number }) {
  try {
    await predictionsStore.savePrediction(data.matchId, data.score1, data.score2)
  } catch (e: any) {
    toast.error(e?.data?.message || t('predictions.saveFailed'))
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      matchesStore.fetchMatches(),
      predictionsStore.fetchPredictions(),
      predictionsStore.fetchProgress(),
    ])
  } finally {
    loading.value = false
  }
})
</script>
