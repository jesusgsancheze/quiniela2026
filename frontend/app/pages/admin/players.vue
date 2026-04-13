<template>
  <div>
    <h1 class="text-3xl font-bold text-primary mb-6">Manage Players</h1>

    <div v-if="loading" class="text-center py-12 text-gray-500">Loading players...</div>

    <div v-else class="card overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b-2 border-primary">
            <th class="py-3 px-4 text-left text-sm font-semibold text-primary">Player</th>
            <th class="py-3 px-4 text-left text-sm font-semibold text-primary">Email</th>
            <th class="py-3 px-4 text-center text-sm font-semibold text-primary">Role</th>
            <th class="py-3 px-4 text-center text-sm font-semibold text-primary">Status</th>
            <th class="py-3 px-4 text-center text-sm font-semibold text-primary">Actions</th>
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
                {{ player.status }}
              </span>
            </td>
            <td class="py-3 px-4 text-center">
              <button
                v-if="player.role !== 'admin'"
                @click="toggleStatus(player)"
                :disabled="togglingId === player._id"
                :class="player.status === 'active' ? 'btn-outline text-sm px-3 py-1' : 'btn-accent text-sm px-3 py-1'"
              >
                {{ player.status === 'active' ? 'Deactivate' : 'Activate' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { User } from '~/types'

definePageMeta({ middleware: 'admin' })

const { apiFetch } = useApi()
const players = ref<(User & { _id: string })[]>([])
const loading = ref(true)
const togglingId = ref<string | null>(null)

async function fetchPlayers() {
  players.value = await apiFetch<(User & { _id: string })[]>('/api/users')
}

async function toggleStatus(player: User & { _id: string }) {
  const newStatus = player.status === 'active' ? 'inactive' : 'active'
  togglingId.value = player._id
  try {
    await apiFetch(`/api/users/${player._id}/status`, {
      method: 'PATCH',
      body: { status: newStatus },
    })
    await fetchPlayers()
  } catch (e: any) {
    alert(e?.data?.message || 'Failed to update status')
  } finally {
    togglingId.value = null
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
