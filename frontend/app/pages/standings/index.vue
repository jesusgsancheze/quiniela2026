<template>
  <div>
    <h1 class="text-3xl font-bold text-primary mb-6">{{ $t('standings.title') }}</h1>

    <div v-if="loading" class="text-center py-12 text-gray-500">{{ $t('standings.loading') }}</div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div v-for="group in groups" :key="group.groupId" class="card">
        <h2 class="text-lg font-bold text-primary mb-3 border-b-2 border-accent pb-2">
          {{ group.groupName }}
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200">
                <th class="py-2 px-1 text-left text-xs font-semibold text-gray-500 w-8">#</th>
                <th class="py-2 px-1 text-left text-xs font-semibold text-gray-500">{{ $t('standings.team') }}</th>
                <th class="py-2 px-1 text-center text-xs font-semibold text-gray-500">P</th>
                <th class="py-2 px-1 text-center text-xs font-semibold text-gray-500">W</th>
                <th class="py-2 px-1 text-center text-xs font-semibold text-gray-500">D</th>
                <th class="py-2 px-1 text-center text-xs font-semibold text-gray-500">L</th>
                <th class="py-2 px-1 text-center text-xs font-semibold text-gray-500">GF</th>
                <th class="py-2 px-1 text-center text-xs font-semibold text-gray-500">GA</th>
                <th class="py-2 px-1 text-center text-xs font-semibold text-gray-500">GD</th>
                <th class="py-2 px-1 text-center text-xs font-semibold text-gray-500 font-bold">Pts</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(team, index) in group.standings"
                :key="team.teamId"
                :class="[
                  'border-b border-gray-50 hover:bg-gray-50 transition-colors',
                  index < 2 ? 'bg-green-50/50' : '',
                  index === 2 ? 'bg-yellow-50/50' : '',
                ]"
              >
                <td class="py-2 px-1 text-gray-500 font-medium">{{ index + 1 }}</td>
                <td class="py-2 px-1">
                  <div class="flex items-center gap-2">
                    <img
                      v-if="team.flagUrl"
                      :src="team.flagUrl"
                      :alt="team.teamName"
                      class="w-6 h-4 object-cover rounded shadow-sm"
                    />
                    <div v-else class="w-6 h-4 bg-gray-200 rounded text-[10px] flex items-center justify-center text-gray-400">
                      {{ team.teamCode }}
                    </div>
                    <span class="font-medium text-gray-800">{{ team.teamName }}</span>
                  </div>
                </td>
                <td class="py-2 px-1 text-center text-gray-600">{{ team.played }}</td>
                <td class="py-2 px-1 text-center text-gray-600">{{ team.won }}</td>
                <td class="py-2 px-1 text-center text-gray-600">{{ team.drawn }}</td>
                <td class="py-2 px-1 text-center text-gray-600">{{ team.lost }}</td>
                <td class="py-2 px-1 text-center text-gray-600">{{ team.goalsFor }}</td>
                <td class="py-2 px-1 text-center text-gray-600">{{ team.goalsAgainst }}</td>
                <td class="py-2 px-1 text-center" :class="team.goalDifference > 0 ? 'text-green-600' : team.goalDifference < 0 ? 'text-red-500' : 'text-gray-500'">
                  {{ team.goalDifference > 0 ? '+' : '' }}{{ team.goalDifference }}
                </td>
                <td class="py-2 px-1 text-center font-bold text-primary">{{ team.points }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex gap-4 mt-3 text-xs text-gray-400">
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-green-100 inline-block"></span> {{ $t('standings.qualifies') }}</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-yellow-100 inline-block"></span> {{ $t('standings.possible3rd') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GroupStandings } from '~/types'

definePageMeta({ middleware: 'auth' })

const { apiFetch } = useApi()
const groups = ref<GroupStandings[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    groups.value = await apiFetch<GroupStandings[]>('/api/groups/standings')
  } finally {
    loading.value = false
  }
})
</script>
