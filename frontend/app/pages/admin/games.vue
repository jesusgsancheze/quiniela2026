<template>
  <div>
    <h1 class="text-3xl font-bold text-primary mb-6">{{ $t('admin.games.title') }}</h1>

    <!-- Stage filter + bulk actions -->
    <div class="flex flex-wrap items-center gap-2 mb-6">
      <button
        v-for="stage in stages"
        :key="stage.value"
        @click="activeStage = stage.value"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          activeStage === stage.value
            ? 'bg-primary text-white'
            : 'bg-white text-gray-600 hover:bg-gray-100'
        ]"
      >
        {{ stage.label }}
      </button>

      <div class="flex-1"></div>

      <button
        @click="autoFillResults"
        :disabled="bulkLoading"
        class="btn-accent text-sm px-4 py-2 disabled:opacity-50"
      >
        {{ bulkLoading ? '...' : $t('admin.games.autoFill') }}
      </button>
      <button
        @click="clearAllResults"
        :disabled="bulkLoading"
        class="text-sm px-4 py-2 rounded-lg font-semibold border-2 border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        {{ $t('admin.games.clearAll') }}
      </button>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-500">{{ $t('admin.games.loading') }}</div>

    <div v-else class="space-y-3">
      <div
        v-for="match in filteredMatches"
        :key="match._id"
        class="card flex flex-col sm:flex-row items-center gap-4"
      >
        <div class="flex-1 flex items-center justify-end gap-2">
          <span class="font-semibold text-primary">{{ match.team1?.code || match.team1Placeholder || 'TBD' }}</span>
          <img v-if="match.team1?.flagUrl" :src="match.team1.flagUrl" :alt="match.team1.code" class="w-8 h-6 object-cover rounded shadow-sm" />
        </div>

        <div class="flex items-center gap-2">
          <template v-if="editingMatch === match._id">
            <input type="number" v-model.number="editScore1" min="0" class="w-14 h-12 text-center text-lg font-bold border-2 border-accent rounded-lg" />
            <span class="text-gray-400 font-bold text-xl">-</span>
            <input type="number" v-model.number="editScore2" min="0" class="w-14 h-12 text-center text-lg font-bold border-2 border-accent rounded-lg" />
          </template>
          <template v-else>
            <span class="w-10 h-10 flex items-center justify-center text-lg font-bold rounded-lg" :class="match.status === 'finished' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'">
              {{ match.score1 ?? '-' }}
            </span>
            <span class="text-gray-400 font-bold">-</span>
            <span class="w-10 h-10 flex items-center justify-center text-lg font-bold rounded-lg" :class="match.status === 'finished' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'">
              {{ match.score2 ?? '-' }}
            </span>
          </template>
        </div>

        <div class="flex-1 flex items-center gap-2">
          <img v-if="match.team2?.flagUrl" :src="match.team2.flagUrl" :alt="match.team2.code" class="w-8 h-6 object-cover rounded shadow-sm" />
          <span class="font-semibold text-primary">{{ match.team2?.code || match.team2Placeholder || 'TBD' }}</span>
        </div>

        <div class="flex gap-2">
          <template v-if="editingMatch === match._id">
            <button @click="saveResult(match._id)" :disabled="saving" class="btn-accent text-sm px-3 py-1">
              {{ saving ? '...' : $t('admin.games.confirm') }}
            </button>
            <button @click="cancelEdit" class="btn-outline text-sm px-3 py-1">{{ $t('admin.games.cancel') }}</button>
          </template>
          <template v-else>
            <button @click="startEdit(match)" class="btn-primary text-sm px-3 py-1">
              {{ match.status === 'finished' ? $t('admin.games.editResult') : $t('admin.games.enterResult') }}
            </button>
            <button
              v-if="match.status === 'finished'"
              @click="clearResult(match._id)"
              class="btn-outline text-sm px-3 py-1 text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
            >
              {{ $t('admin.games.clearResult') }}
            </button>
          </template>
        </div>

        <div class="w-50 text-center text-xs text-gray-400 mt-1">
          #{{ match.matchNumber }} &middot; {{ formatDate(match.date) }} &middot; {{ match.venue }}
          <span v-if="match.group" class="ml-1 bg-gray-100 px-2 py-0.5 rounded">{{ match.group.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Match } from '~/types'

definePageMeta({ middleware: 'admin' })

const { t } = useI18n()
const { apiFetch } = useApi()
const matchesStore = useMatchesStore()
const loading = ref(true)
const saving = ref(false)
const bulkLoading = ref(false)
const activeStage = ref('all')
const editingMatch = ref<string | null>(null)
const editScore1 = ref<number>(0)
const editScore2 = ref<number>(0)

const stages = computed(() => [
  { value: 'all', label: t('admin.games.all') },
  { value: 'group', label: t('admin.games.groupStage') },
])

const filteredMatches = computed(() => {
  const groupOnly = matchesStore.matches.filter((m) => m.stage === 'group')
  if (activeStage.value === 'all') return groupOnly
  return groupOnly
})

function startEdit(match: Match) {
  editingMatch.value = match._id
  editScore1.value = match.score1 ?? 0
  editScore2.value = match.score2 ?? 0
}

function cancelEdit() {
  editingMatch.value = null
}

async function clearResult(matchId: string) {
  if (!confirm(t('admin.games.clearConfirm'))) return
  try {
    await apiFetch(`/api/matches/${matchId}/result`, { method: 'DELETE' })
    await matchesStore.fetchMatches()
  } catch (e: any) {
    alert(e?.data?.message || t('admin.games.clearFailed'))
  }
}

async function saveResult(matchId: string) {
  saving.value = true
  try {
    await apiFetch(`/api/matches/${matchId}/result`, {
      method: 'PATCH',
      body: { score1: editScore1.value, score2: editScore2.value },
    })
    editingMatch.value = null
    await matchesStore.fetchMatches()
  } catch (e: any) {
    alert(e?.data?.message || t('admin.games.saveFailed'))
  } finally {
    saving.value = false
  }
}

async function autoFillResults() {
  if (!confirm(t('admin.games.autoFillConfirm'))) return
  bulkLoading.value = true
  try {
    const res = await apiFetch<{ filled: number }>('/api/matches/auto-fill', { method: 'POST' })
    alert(t('admin.games.autoFillSuccess', { count: res.filled }))
    await matchesStore.fetchMatches()
  } catch (e: any) {
    alert(e?.data?.message || t('admin.games.autoFillFailed'))
  } finally {
    bulkLoading.value = false
  }
}

async function clearAllResults() {
  if (!confirm(t('admin.games.clearAllConfirm'))) return
  bulkLoading.value = true
  try {
    const res = await apiFetch<{ cleared: number }>('/api/matches/results/all', { method: 'DELETE' })
    alert(t('admin.games.clearAllSuccess', { count: res.cleared }))
    await matchesStore.fetchMatches()
  } catch (e: any) {
    alert(e?.data?.message || t('admin.games.clearAllFailed'))
  } finally {
    bulkLoading.value = false
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
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
