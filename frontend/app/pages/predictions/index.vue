<template>
  <div>
    <h1 class="text-3xl font-bold text-primary mb-6">{{ $t('predictions.title') }}</h1>

    <!-- Inactive warning -->
    <div v-if="!authStore.isActive && !authStore.isAdmin" class="bg-yellow-50 border border-yellow-200 text-yellow-800 px-6 py-4 rounded-xl mb-6">
      <p class="font-semibold">{{ $t('predictions.inactiveTitle') }}</p>
      <p class="text-sm">{{ $t('predictions.inactiveMessage') }}</p>
    </div>

    <!-- No active entry: prompt to start a new one -->
    <div
      v-else-if="!entriesStore.activeEntry && !authStore.isAdmin"
      class="card text-center py-10 mb-6"
    >
      <h2 class="text-lg font-semibold text-primary mb-2">{{ $t('predictions.noActiveTitle') }}</h2>
      <p class="text-gray-600 mb-4">{{ $t('predictions.noActiveDesc') }}</p>
      <button @click="requestNewEntry" :disabled="creating" class="btn-primary">
        {{ creating ? $t('predictions.creatingEntry') : $t('predictions.startNewEntry') }}
      </button>
    </div>

    <!-- Active entry pending payment confirmation -->
    <div
      v-else-if="entriesStore.activeEntry && entriesStore.activeEntry.paymentStatus !== 'confirmed' && !authStore.isAdmin"
      class="bg-blue-50 border border-blue-200 text-blue-800 px-6 py-4 rounded-xl mb-6"
    >
      <p class="font-semibold">
        {{ $t('predictions.entryNumber', { n: entriesStore.activeEntry.entryNumber }) }} —
        {{ entriesStore.activeEntry.paymentStatus === 'reported'
            ? $t('predictions.paymentAwaitingApproval')
            : $t('predictions.paymentRequired') }}
      </p>
      <p class="text-sm mt-1">{{ $t('predictions.goToPayment') }}</p>
      <NuxtLink to="/payment" class="inline-block mt-3 text-blue-700 underline font-medium">
        {{ $t('predictions.openPayment') }}
      </NuxtLink>
    </div>

    <!-- Header: entry number + progress + new-entry CTA -->
    <template v-if="entriesStore.activeEntry?.paymentStatus === 'confirmed' || authStore.isAdmin">
      <!-- Progress bar -->
      <div v-if="predictionsStore.progress" class="card mb-6">
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm font-medium text-gray-600">
            <template v-if="entriesStore.activeEntry">
              {{ $t('predictions.entryNumber', { n: entriesStore.activeEntry.entryNumber }) }} —
            </template>
            {{ $t('predictions.progress') }}
          </span>
          <span class="text-sm font-bold text-accent">
            {{ predictionsStore.progress.filled }}/{{ predictionsStore.progress.total }} ({{ predictionsStore.progress.percentage }}%)
          </span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3">
          <div class="bg-accent rounded-full h-3 transition-all duration-500" :style="{ width: `${predictionsStore.progress.percentage}%` }"></div>
        </div>
      </div>

      <!-- Entry completed: offer new entry -->
      <div
        v-if="entriesStore.canRequestNewEntry && !authStore.isAdmin"
        class="card border-l-4 border-green-500 mb-6 flex items-center justify-between"
      >
        <div>
          <p class="font-semibold text-primary">{{ $t('predictions.entryCompleteTitle') }}</p>
          <p class="text-sm text-gray-600">{{ $t('predictions.entryCompleteDesc') }}</p>
        </div>
        <button @click="requestNewEntry" :disabled="creating" class="btn-primary">
          {{ creating ? $t('predictions.creatingEntry') : $t('predictions.newPrediction') }}
        </button>
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
    </template>
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
const entriesStore = useEntriesStore()
const loading = ref(true)
const creating = ref(false)
const activeTab = ref('all')

const tabs = computed(() => [
  { value: 'all', label: t('predictions.allMatches') },
  { value: 'filled', label: t('predictions.filled') },
  { value: 'unfilled', label: t('predictions.unfilled') },
])

const canEdit = computed(() => {
  const deadline = new Date('2026-06-11T00:00:00Z')
  if (authStore.isAdmin) return new Date() < deadline
  if (!authStore.isActive) return false
  const e = entriesStore.activeEntry
  if (!e || e.paymentStatus !== 'confirmed' || e.status === 'completed') return false
  return new Date() < deadline
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
    // Re-fetch active entry; it may have just transitioned to "completed".
    await entriesStore.fetchMine()
  } catch (e: any) {
    toast.error(e?.data?.message || t('predictions.saveFailed'))
  }
}

async function requestNewEntry() {
  creating.value = true
  try {
    await entriesStore.createNewEntry()
    toast.success(t('predictions.newEntryCreated'))
    await navigateTo('/payment')
    // Refresh predictions/progress in background; failures here shouldn't
    // block the navigation to /payment.
    Promise.allSettled([
      predictionsStore.fetchPredictions(),
      predictionsStore.fetchProgress(),
    ])
  } catch (e: any) {
    toast.error(e?.data?.message || t('predictions.newEntryFailed'))
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      matchesStore.fetchMatches(),
      entriesStore.fetchMine(),
      predictionsStore.fetchPredictions(),
      predictionsStore.fetchProgress(),
    ])
  } finally {
    loading.value = false
  }
})
</script>
