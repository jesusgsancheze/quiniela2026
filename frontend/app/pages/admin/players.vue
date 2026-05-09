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
            <th class="py-3 px-4 text-center text-sm font-semibold text-primary">{{ $t('admin.players.payment') }}</th>
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
            <td class="py-3 px-4 text-center">
              <div v-if="player.role !== 'admin'" class="flex flex-col items-center justify-center gap-1">
                <div v-if="player.latestEntry" class="flex items-center justify-center gap-2 flex-wrap">
                  <span class="text-xs text-gray-500">#{{ player.latestEntry.entryNumber }}</span>
                  <span :class="[
                    'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                    player.latestEntry.paymentStatus === 'confirmed' ? 'bg-green-100 text-green-800' :
                    player.latestEntry.paymentStatus === 'reported' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-600'
                  ]">
                    {{ $t(`admin.players.payment${capitalize(player.latestEntry.paymentStatus || 'pending')}`) }}
                  </span>
                  <template v-if="player.latestEntry.paymentStatus === 'reported'">
                    <button
                      @click="confirmPayment(player._id, player.latestEntry._id)"
                      class="text-green-600 hover:text-green-800 text-xs font-semibold"
                    >
                      {{ $t('admin.players.confirmPayment') }}
                    </button>
                    <button
                      @click="rejectPayment(player._id, player.latestEntry._id)"
                      class="text-red-500 hover:text-red-700 text-xs font-semibold"
                    >
                      {{ $t('admin.players.rejectPayment') }}
                    </button>
                  </template>
                </div>
                <button
                  v-if="player.entries && player.entries.length > 1"
                  @click="toggleEntries(player._id)"
                  class="text-xs text-gray-500 underline hover:text-primary"
                >
                  {{ expandedPlayer === player._id ? $t('admin.players.hideHistory') : $t('admin.players.showHistory', { n: player.entries.length }) }}
                </button>
                <ul v-if="expandedPlayer === player._id" class="text-left text-xs text-gray-600 mt-1 space-y-1 w-full max-w-xs">
                  <li v-for="e in player.entries" :key="e._id" class="flex justify-between gap-2">
                    <span>#{{ e.entryNumber }}</span>
                    <span class="text-gray-500">{{ e.progress.percentage }}%</span>
                    <span :class="[
                      'px-1.5 py-0.5 rounded text-[10px]',
                      e.paymentStatus === 'confirmed' ? 'bg-green-100 text-green-800' :
                      e.paymentStatus === 'reported' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-600'
                    ]">{{ $t(`admin.players.payment${capitalize(e.paymentStatus)}`) }}</span>
                    <span :class="[
                      'px-1.5 py-0.5 rounded text-[10px]',
                      e.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    ]">{{ e.status }}</span>
                  </li>
                </ul>
              </div>
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
import type { User, PredictionProgress, Entry } from '~/types'

type EntrySummary = Entry & { progress: PredictionProgress }
type PlayerWithProgress = User & {
  _id: string
  progress?: PredictionProgress
  entries?: EntrySummary[]
  latestEntry?: EntrySummary | null
}

definePageMeta({ middleware: 'admin' })

const { t } = useI18n()
const toast = useToast()
const { apiFetch } = useApi()
const players = ref<PlayerWithProgress[]>([])
const loading = ref(true)
const togglingId = ref<string | null>(null)
const resettingId = ref<string | null>(null)
const newPassword = ref('')
const expandedPlayer = ref<string | null>(null)

function toggleEntries(playerId: string) {
  expandedPlayer.value = expandedPlayer.value === playerId ? null : playerId
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

async function fetchPlayers() {
  players.value = await apiFetch<PlayerWithProgress[]>('/api/users')
}

async function confirmPayment(userId: string, entryId?: string) {
  try {
    const qs = entryId ? `?entryId=${entryId}` : ''
    await apiFetch(`/api/payments/${userId}/confirm${qs}`, { method: 'PATCH' })
    await fetchPlayers()
  } catch (e: any) {
    toast.error(e?.data?.message || 'Failed')
  }
}

async function rejectPayment(userId: string, entryId?: string) {
  try {
    const qs = entryId ? `?entryId=${entryId}` : ''
    await apiFetch(`/api/payments/${userId}/reject${qs}`, { method: 'PATCH' })
    await fetchPlayers()
  } catch (e: any) {
    toast.error(e?.data?.message || 'Failed')
  }
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
    toast.error(e?.data?.message || t('admin.players.updateFailed'))
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
    toast.success(t('admin.players.resetSuccess'))
    cancelReset()
  } catch (e: any) {
    toast.error(e?.data?.message || t('admin.players.resetFailed'))
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
