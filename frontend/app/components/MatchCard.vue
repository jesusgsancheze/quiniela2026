<template>
  <div class="card flex flex-col sm:flex-row items-center gap-4 relative">
    <!-- Match result badge -->
    <div v-if="match.status === 'finished'" class="absolute top-2 right-2">
      <span class="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
        Final
      </span>
    </div>

    <!-- Points badge -->
    <div v-if="prediction?.points != null" class="absolute top-2 left-2">
      <span :class="[
        'text-xs font-bold px-2 py-1 rounded-full',
        prediction.points === 3 ? 'bg-accent text-primary-dark' :
        prediction.points === 1 ? 'bg-blue-100 text-blue-800' :
        'bg-gray-100 text-gray-600'
      ]">
        {{ prediction.points }} pts
      </span>
    </div>

    <!-- Team 1 -->
    <div class="flex-1 flex items-center justify-center sm:justify-end gap-2">
      <div class="text-center sm:text-right">
        <p class="font-semibold text-primary">
          {{ match.team1?.name || match.team1Placeholder || 'TBD' }}
        </p>
        <p v-if="match.team1?.code" class="text-xs text-gray-400">{{ match.team1.code }}</p>
      </div>
      <img
        v-if="match.team1?.flagUrl"
        :src="match.team1.flagUrl"
        :alt="match.team1.name"
        class="w-10 h-7 object-cover rounded shadow-sm"
      />
      <div v-else class="w-10 h-7 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
        {{ match.team1?.code || '?' }}
      </div>
    </div>

    <!-- Score / Input -->
    <div class="flex items-center gap-2">
      <template v-if="canEdit && match.status !== 'finished'">
        <input
          type="number"
          v-model.number="score1"
          min="0"
          max="20"
          class="w-14 h-12 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none"
        />
        <span class="text-gray-400 font-bold text-xl">-</span>
        <input
          type="number"
          v-model.number="score2"
          min="0"
          max="20"
          class="w-14 h-12 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none"
        />
      </template>
      <template v-else>
        <div class="flex items-center gap-2">
          <span class="w-10 h-10 flex items-center justify-center text-lg font-bold bg-primary-dark text-white rounded-lg">
            {{ match.status === 'finished' ? match.score1 : (prediction?.score1 ?? '-') }}
          </span>
          <span class="text-gray-400 font-bold">-</span>
          <span class="w-10 h-10 flex items-center justify-center text-lg font-bold bg-primary-dark text-white rounded-lg">
            {{ match.status === 'finished' ? match.score2 : (prediction?.score2 ?? '-') }}
          </span>
        </div>
      </template>
    </div>

    <!-- Team 2 -->
    <div class="flex-1 flex items-center justify-center sm:justify-start gap-2">
      <img
        v-if="match.team2?.flagUrl"
        :src="match.team2.flagUrl"
        :alt="match.team2.name"
        class="w-10 h-7 object-cover rounded shadow-sm"
      />
      <div v-else class="w-10 h-7 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
        {{ match.team2?.code || '?' }}
      </div>
      <div class="text-center sm:text-left">
        <p class="font-semibold text-primary">
          {{ match.team2?.name || match.team2Placeholder || 'TBD' }}
        </p>
        <p v-if="match.team2?.code" class="text-xs text-gray-400">{{ match.team2.code }}</p>
      </div>
    </div>

    <!-- Save button -->
    <div v-if="canEdit && match.status !== 'finished'" class="sm:ml-4">
      <button
        @click="handleSave"
        :disabled="saving || score1 == null || score2 == null"
        class="btn-accent text-sm px-4 py-2 disabled:opacity-50"
      >
        {{ saving ? '...' : (prediction ? 'Update' : 'Save') }}
      </button>
    </div>

    <!-- Match info -->
    <div class="w-full text-center text-xs text-gray-400 mt-2 sm:mt-0 sm:absolute sm:bottom-2 sm:left-0 sm:right-0">
      {{ formatDate(match.date) }} &middot; {{ match.venue }}
      <span v-if="match.group" class="ml-2 bg-gray-100 px-2 py-0.5 rounded">{{ match.group.name }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Match, Prediction } from '~/types'

const props = defineProps<{
  match: Match
  prediction?: Prediction
  canEdit: boolean
}>()

const emit = defineEmits<{
  save: [data: { matchId: string; score1: number; score2: number }]
}>()

const score1 = ref<number | null>(props.prediction?.score1 ?? null)
const score2 = ref<number | null>(props.prediction?.score2 ?? null)
const saving = ref(false)

watch(() => props.prediction, (pred) => {
  if (pred) {
    score1.value = pred.score1
    score2.value = pred.score2
  }
})

async function handleSave() {
  if (score1.value == null || score2.value == null) return
  saving.value = true
  try {
    emit('save', {
      matchId: props.match._id,
      score1: score1.value,
      score2: score2.value,
    })
  } finally {
    saving.value = false
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>
