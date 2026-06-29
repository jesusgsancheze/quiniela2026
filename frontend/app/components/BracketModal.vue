<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-2 sm:p-6 overflow-y-auto"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-xl shadow-xl w-full max-w-6xl my-4">
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl z-10">
        <h3 class="font-semibold text-primary truncate pr-2">{{ title }}</h3>
        <button class="text-gray-400 hover:text-gray-600 text-2xl leading-none" :aria-label="$t('knockout.close')" @click="$emit('close')">×</button>
      </div>
      <div class="p-3 sm:p-4">
        <div v-if="loading" class="text-center py-10 text-gray-500">{{ $t('knockout.loading') }}</div>
        <BracketDiagram v-else :matches="drawMatches" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DrawMatch } from '~/types'

const props = defineProps<{ open: boolean; entryId: string | null; title: string }>()
defineEmits<{ close: [] }>()

const { apiFetch } = useApi()
const loading = ref(false)
const drawMatches = ref<DrawMatch[]>([])

watch(
  () => [props.open, props.entryId] as const,
  async ([open, id]) => {
    if (!open || !id) return
    loading.value = true
    drawMatches.value = []
    try {
      const res = await apiFetch<{ matches: any[] }>(`/api/knockout/entries/${id}/bracket`)
      drawMatches.value = res.matches.map((m) => ({
        matchNumber: m.matchNumber,
        stage: m.stage,
        date: m.date,
        venue: m.venue,
        placeholder1: m.placeholder1,
        placeholder2: m.placeholder2,
        team1: m.team1,
        team2: m.team2,
        score1: m.score1,
        score2: m.score2,
        winnerSide: m.advances,
        note: null,
      }))
    } finally {
      loading.value = false
    }
  },
)
</script>
