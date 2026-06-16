<template>
  <div>
    <h1 class="text-3xl font-bold text-primary mb-6">
      {{ $t('home.welcome', { name: authStore.user?.firstName }) }}
    </h1>

    <!-- Status warning for inactive players -->
    <div v-if="!authStore.isAdmin && !authStore.isActive" class="bg-yellow-50 border border-yellow-200 text-yellow-800 px-6 py-4 rounded-xl mb-6">
      <h3 class="font-semibold mb-1">{{ $t('home.pendingTitle') }}</h3>
      <p class="text-sm">{{ $t('home.pendingMessage') }}</p>
    </div>

    <!-- Quick stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="card text-center">
        <p class="text-gray-500 text-sm mb-1">{{ $t('home.yourRole') }}</p>
        <p class="text-2xl font-bold text-primary capitalize">{{ authStore.user?.role }}</p>
      </div>
      <div class="card text-center">
        <p class="text-gray-500 text-sm mb-1">{{ $t('home.accountStatus') }}</p>
        <span :class="authStore.isActive ? 'badge-active' : 'badge-inactive'" class="text-lg">
          {{ $t(`common.${authStore.user?.status}`) }}
        </span>
      </div>
      <div v-if="progress" class="card text-center">
        <p class="text-gray-500 text-sm mb-1">{{ $t('home.predictionsProgress') }}</p>
        <p class="text-2xl font-bold text-accent">{{ progress.percentage }}%</p>
        <p class="text-xs text-gray-400 mt-1">{{ progress.filled }}/{{ progress.total }} {{ $t('home.matches') }}</p>
      </div>
      <div v-if="myRanking && !authStore.isAdmin" class="card text-center">
        <p class="text-gray-500 text-sm mb-1">{{ $t('home.yourPosition') }}</p>
        <p class="text-3xl font-bold" :class="myRanking.rank <= 3 ? 'text-accent' : 'text-primary'">
          #{{ myRanking.rank }}
        </p>
        <p class="text-xs text-gray-400 mt-1">{{ myRanking.totalPoints }} {{ $t('positions.points') }}</p>
      </div>
    </div>

    <!-- Live results worker status (admin only) -->
    <div v-if="authStore.isAdmin" class="card mb-8">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 class="font-semibold text-primary text-lg">{{ $t('liveStatus.title') }}</h3>
          <p class="text-xs text-gray-400">{{ $t('liveStatus.subtitle') }}</p>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="text-xs font-semibold px-2 py-1 rounded-full"
            :class="liveStatus?.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
          >
            {{ liveStatus?.enabled ? $t('liveStatus.enabled') : $t('liveStatus.disabled') }}
          </span>
          <button
            type="button"
            class="text-xs font-medium text-primary border border-gray-200 rounded-md px-2.5 py-1 hover:bg-gray-50"
            @click="loadLiveStatus"
          >
            {{ $t('liveStatus.refresh') }}
          </button>
          <button
            type="button"
            :disabled="syncing"
            class="text-xs font-medium text-white bg-primary rounded-md px-2.5 py-1 disabled:opacity-50"
            @click="forceSync"
          >
            {{ syncing ? $t('liveStatus.syncing') : $t('liveStatus.syncNow') }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
        <div class="bg-gray-50 rounded-lg py-2">
          <p class="text-[11px] uppercase text-gray-400">{{ $t('liveStatus.lastChecked') }}</p>
          <p class="text-sm font-semibold text-primary">{{ liveStatus?.checkedAt ? formatTime(liveStatus.checkedAt) : $t('liveStatus.never') }}</p>
        </div>
        <div class="bg-gray-50 rounded-lg py-2">
          <p class="text-[11px] uppercase text-gray-400">{{ $t('liveStatus.lastPolled') }}</p>
          <p class="text-sm font-semibold text-primary">{{ liveStatus?.polledAt ? formatTime(liveStatus.polledAt) : $t('liveStatus.never') }}</p>
        </div>
        <div class="bg-gray-50 rounded-lg py-2">
          <p class="text-[11px] uppercase text-gray-400">{{ $t('liveStatus.updated') }}</p>
          <p class="text-sm font-semibold text-primary">{{ liveStatus?.updated ?? 0 }}</p>
        </div>
        <div class="bg-gray-50 rounded-lg py-2">
          <p class="text-[11px] uppercase text-gray-400">{{ $t('liveStatus.unmatched') }}</p>
          <p class="text-sm font-semibold text-primary">{{ liveStatus?.unmatchedFixtures ?? 0 }}</p>
        </div>
      </div>

      <p class="text-xs mb-3">
        <span
          class="inline-flex items-center gap-1"
          :class="liveStatus?.inWindow ? 'text-amber-600' : 'text-gray-400'"
        >
          <span
            class="w-1.5 h-1.5 rounded-full"
            :class="liveStatus?.inWindow ? 'bg-amber-500 animate-pulse' : 'bg-gray-300'"
          ></span>
          {{ liveStatus?.inWindow ? $t('liveStatus.inWindow') : $t('liveStatus.idle') }}
        </span>
      </p>

      <div v-if="liveStatus?.error" class="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 mb-3">
        {{ $t('liveStatus.error') }}: {{ liveStatus.error }}
      </div>

      <p class="text-[11px] uppercase tracking-wider text-gray-400 mb-2">{{ $t('liveStatus.matchesRead') }}</p>
      <div v-if="sortedFixtures.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-[11px] uppercase text-gray-400 border-b border-gray-100">
              <th class="py-1 pr-2">{{ $t('liveStatus.match') }}</th>
              <th class="py-1 px-2 text-center">{{ $t('liveStatus.score') }}</th>
              <th class="py-1 px-2 text-center">{{ $t('liveStatus.provider') }}</th>
              <th class="py-1 pl-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(f, i) in pagedFixtures" :key="i" class="border-b border-gray-50">
              <td class="py-1.5 pr-2 text-primary">{{ f.home }} vs {{ f.away }}</td>
              <td class="py-1.5 px-2 text-center font-semibold">{{ f.score }}</td>
              <td class="py-1.5 px-2 text-center text-gray-500">{{ f.status }}</td>
              <td class="py-1.5 pl-2 text-right">
                <span v-if="!f.matched" class="text-[11px] text-red-500">{{ $t('liveStatus.notMatched') }}</span>
                <span v-else-if="f.changed" class="text-[11px] text-green-600 font-semibold">{{ $t('liveStatus.changed') }}</span>
                <span v-else class="text-[11px] text-gray-400">{{ $t('liveStatus.skipped') }}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-between gap-3 mt-3">
          <p class="text-[11px] text-gray-400">
            {{ $t('liveStatus.showing', { from: rangeFrom, to: rangeTo, total: sortedFixtures.length }) }}
          </p>
          <div class="flex items-center gap-2">
            <button
              type="button"
              :disabled="fixturePage <= 1"
              class="text-xs font-medium text-primary border border-gray-200 rounded-md px-2.5 py-1 disabled:opacity-40"
              @click="fixturePage--"
            >
              {{ $t('liveStatus.prev') }}
            </button>
            <span class="text-xs text-gray-500">{{ fixturePage }} / {{ totalPages }}</span>
            <button
              type="button"
              :disabled="fixturePage >= totalPages"
              class="text-xs font-medium text-primary border border-gray-200 rounded-md px-2.5 py-1 disabled:opacity-40"
              @click="fixturePage++"
            >
              {{ $t('liveStatus.next') }}
            </button>
          </div>
        </div>
      </div>
      <p v-else class="text-sm text-gray-400">{{ $t('liveStatus.noFixtures') }}</p>
    </div>

    <!-- Quick links -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <template v-if="authStore.isAdmin">
        <NuxtLink to="/admin/games" class="card hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-accent">
          <h3 class="font-semibold text-primary text-lg">{{ $t('home.manageGames') }}</h3>
          <p class="text-gray-500 text-sm mt-1">{{ $t('home.manageGamesDesc') }}</p>
        </NuxtLink>
        <NuxtLink to="/admin/players" class="card hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-secondary">
          <h3 class="font-semibold text-primary text-lg">{{ $t('home.managePlayers') }}</h3>
          <p class="text-gray-500 text-sm mt-1">{{ $t('home.managePlayersDesc') }}</p>
        </NuxtLink>
      </template>
      <template v-else>
        <NuxtLink to="/predictions" class="card hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-accent">
          <h3 class="font-semibold text-primary text-lg">{{ $t('home.myPredictions') }}</h3>
          <p class="text-gray-500 text-sm mt-1">{{ $t('home.myPredictionsDesc') }}</p>
        </NuxtLink>
      </template>
      <NuxtLink to="/positions" class="card hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-primary">
        <h3 class="font-semibold text-primary text-lg">{{ $t('home.leaderboard') }}</h3>
        <p class="text-gray-500 text-sm mt-1">{{ $t('home.leaderboardDesc') }}</p>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PredictionProgress, LeaderboardEntry, LiveSyncStatus } from '~/types'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const authStore = useAuthStore()
const { apiFetch } = useApi()
const toast = useToast()
const progress = ref<PredictionProgress | null>(null)
const myRanking = ref<LeaderboardEntry | null>(null)

const liveStatus = ref<LiveSyncStatus | null>(null)
const syncing = ref(false)
let statusTimer: ReturnType<typeof setInterval> | null = null

// --- Fixtures list: newest first, paginated 10 per page ---
const FIXTURES_PER_PAGE = 10
const fixturePage = ref(1)

// Sort by kickoff date, most recent first. Fixtures without a date go last.
const sortedFixtures = computed(() => {
  const list = liveStatus.value?.fixtures ?? []
  return [...list].sort((a, b) => {
    const ta = a.date ? new Date(a.date).getTime() : -Infinity
    const tb = b.date ? new Date(b.date).getTime() : -Infinity
    return tb - ta
  })
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(sortedFixtures.value.length / FIXTURES_PER_PAGE)),
)

const pagedFixtures = computed(() => {
  const start = (fixturePage.value - 1) * FIXTURES_PER_PAGE
  return sortedFixtures.value.slice(start, start + FIXTURES_PER_PAGE)
})

const rangeFrom = computed(() =>
  sortedFixtures.value.length === 0
    ? 0
    : (fixturePage.value - 1) * FIXTURES_PER_PAGE + 1,
)
const rangeTo = computed(() =>
  Math.min(fixturePage.value * FIXTURES_PER_PAGE, sortedFixtures.value.length),
)

// Keep the current page within bounds when the list shrinks/grows.
watch(totalPages, (max) => {
  if (fixturePage.value > max) fixturePage.value = max
})

async function loadLiveStatus() {
  try {
    liveStatus.value = await apiFetch<LiveSyncStatus>('/api/live-results/status')
  } catch {}
}

async function forceSync() {
  if (syncing.value) return
  syncing.value = true
  try {
    await apiFetch('/api/live-results/sync', { method: 'POST' })
    await loadLiveStatus()
    toast.success(t('liveStatus.syncDone'))
  } catch {
    toast.error(t('liveStatus.syncFailed'))
  } finally {
    syncing.value = false
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

onMounted(async () => {
  await authStore.fetchProfile()
  if (authStore.isActive || authStore.isAdmin) {
    try {
      progress.value = await apiFetch<PredictionProgress>('/api/predictions/progress')
    } catch {}
  }
  try {
    const rankings = await apiFetch<LeaderboardEntry[]>('/api/leaderboard')
    const userId = authStore.user?.id || authStore.user?._id
    const mine = rankings.filter((r) => r.userId === userId)
    myRanking.value = mine[0] ?? null
  } catch {}

  // Admins get the live-results worker dashboard, refreshed every 30s.
  if (authStore.isAdmin) {
    await loadLiveStatus()
    statusTimer = setInterval(loadLiveStatus, 30_000)
  }
})

onUnmounted(() => {
  if (statusTimer) clearInterval(statusTimer)
})
</script>
