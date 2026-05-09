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
import type { PredictionProgress, LeaderboardEntry } from '~/types'

definePageMeta({ middleware: 'auth' })

const authStore = useAuthStore()
const { apiFetch } = useApi()
const progress = ref<PredictionProgress | null>(null)
const myRanking = ref<LeaderboardEntry | null>(null)

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
})
</script>
