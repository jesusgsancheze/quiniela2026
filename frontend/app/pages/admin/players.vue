<template>
  <div>
    <h1 class="text-3xl font-bold text-primary mb-6">{{ $t('admin.players.title') }}</h1>

    <div v-if="loading" class="text-center py-12 text-gray-500">{{ $t('admin.players.loading') }}</div>

    <div v-else class="card overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b-2 border-primary">
            <th class="py-3 px-4 text-left text-sm font-semibold text-primary">{{ $t('admin.players.player') }}</th>
            <th class="py-3 px-4 text-left text-sm font-semibold text-primary">{{ $t('admin.players.email') }}</th>
            <th class="py-3 px-4 text-center text-sm font-semibold text-primary">{{ $t('admin.players.role') }}</th>
            <th class="py-3 px-4 text-center text-sm font-semibold text-primary">{{ $t('admin.players.status') }}</th>
            <th class="py-3 px-4 text-center text-sm font-semibold text-primary">{{ $t('admin.players.progress') }}</th>
            <th class="py-3 px-4 text-center text-sm font-semibold text-primary">{{ $t('admin.players.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="player in players" :key="player._id" class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-3 px-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                  {{ player.firstName[0] }}{{ player.lastName[0] }}
                </div>
                <span class="font-medium">{{ player.firstName }} {{ player.lastName }}</span>
              </div>
            </td>
            <td class="py-3 px-4 text-gray-600 text-sm">{{ player.email }}</td>
            <td class="py-3 px-4 text-center">
              <span class="capitalize text-sm text-gray-600">{{ player.role }}</span>
            </td>
            <td class="py-3 px-4 text-center">
              <span :class="player.status === 'active' ? 'badge-active' : 'badge-inactive'">
                {{ $t(`common.${player.status}`) }}
              </span>
            </td>
            <td class="py-3 px-4">
              <div v-if="player.progress" class="min-w-[120px]">
                <div class="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{{ player.progress.filled }}/{{ player.progress.total }}</span>
                  <span class="font-semibold" :class="player.progress.percentage === 100 ? 'text-green-600' : 'text-accent'">
                    {{ player.progress.percentage }}%
                  </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="rounded-full h-2 transition-all duration-300"
                    :class="player.progress.percentage === 100 ? 'bg-green-500' : 'bg-accent'"
                    :style="{ width: `${player.progress.percentage}%` }"
                  ></div>
                </div>
              </div>
              <span v-else class="text-xs text-gray-400">0%</span>
            </td>
            <td class="py-3 px-4">
              <div v-if="player.role !== 'admin'" class="flex items-center justify-center gap-2 flex-wrap">
                <button
                  @click="toggleStatus(player)"
                  :disabled="togglingId === player._id"
                  :class="player.status === 'active' ? 'btn-outline text-sm px-3 py-1' : 'btn-accent text-sm px-3 py-1'"
                >
                  {{ player.status === 'active' ? $t('admin.players.deactivate') : $t('admin.players.activate') }}
                </button>

                <!-- Reset password -->
                <template v-if="resettingId === player._id">
                  <input
                    v-model="newPassword"
                    type="password"
                    :placeholder="$t('admin.players.newPassword')"
                    class="input-field w-36 text-sm px-2 py-1"
                    minlength="6"
                  />
                  <button
                    @click="confirmReset(player._id)"
                    :disabled="!newPassword || newPassword.length < 6"
                    class="btn-accent text-sm px-3 py-1 disabled:opacity-50"
                  >
                    {{ $t('admin.players.resetConfirm') }}
                  </button>
                  <button @click="cancelReset" class="btn-outline text-sm px-3 py-1">
                    {{ $t('admin.games.cancel') }}
                  </button>
                </template>
                <button
                  v-else
                  @click="startReset(player._id)"
                  class="btn-secondary text-sm px-3 py-1"
                >
                  {{ $t('admin.players.resetPassword') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { User, PredictionProgress } from '~/types'

type PlayerWithProgress = User & { _id: string; progress?: PredictionProgress }

definePageMeta({ middleware: 'admin' })

const { t } = useI18n()
const { apiFetch } = useApi()
const players = ref<PlayerWithProgress[]>([])
const loading = ref(true)
const togglingId = ref<string | null>(null)
const resettingId = ref<string | null>(null)
const newPassword = ref('')

async function fetchPlayers() {
  players.value = await apiFetch<PlayerWithProgress[]>('/api/users')
}

async function toggleStatus(player: PlayerWithProgress) {
  const newStatus = player.status === 'active' ? 'inactive' : 'active'
  togglingId.value = player._id
  try {
    await apiFetch(`/api/users/${player._id}/status`, {
      method: 'PATCH',
      body: { status: newStatus },
    })
    await fetchPlayers()
  } catch (e: any) {
    alert(e?.data?.message || t('admin.players.updateFailed'))
  } finally {
    togglingId.value = null
  }
}

function startReset(playerId: string) {
  resettingId.value = playerId
  newPassword.value = ''
}

function cancelReset() {
  resettingId.value = null
  newPassword.value = ''
}

async function confirmReset(playerId: string) {
  try {
    await apiFetch(`/api/users/${playerId}/reset-password`, {
      method: 'PATCH',
      body: { newPassword: newPassword.value },
    })
    alert(t('admin.players.resetSuccess'))
    cancelReset()
  } catch (e: any) {
    alert(e?.data?.message || t('admin.players.resetFailed'))
  }
}

onMounted(async () => {
  try {
    await fetchPlayers()
  } finally {
    loading.value = false
  }
})
</script>
