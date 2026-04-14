<template>
  <div class="card flex flex-col sm:flex-row items-center gap-4 relative">
    <!-- Match result badge -->
    <div v-if="match.status === 'finished'" class="absolute top-2 right-2">
      <span class="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
        {{ $t('match.final') }}
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
        {{ prediction.points }} {{ $t('match.pts') }}
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
    <div class="flex flex-col items-center gap-1">
      <!-- Editable inputs (match not finished, user can edit) -->
      <template v-if="canEdit && match.status !== 'finished'">
        <div class="flex items-center gap-2">
          <input
            type="number"
            v-model.number="score1"
            min="0"
            max="20"
            @blur="tryAutoSave"
            class="w-14 h-12 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none"
          />
          <span class="text-gray-400 font-bold text-xl">-</span>
          <input
            type="number"
            v-model.number="score2"
            min="0"
            max="20"
            @blur="tryAutoSave"
            class="w-14 h-12 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none"
          />
        </div>
        <!-- Save status -->
        <div class="h-5 flex items-center">
          <span v-if="saving" class="text-xs text-gray-400">{{ $t('match.saving') }}</span>
          <span v-else-if="justSaved" class="text-xs text-green-500 font-medium">{{ $t('match.saved') }}</span>
        </div>
      </template>

      <!-- Finished match: show result + user prediction -->
      <template v-else-if="match.status === 'finished'">
        <!-- Actual result -->
        <p class="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{{ $t('match.result') }}</p>
        <div class="flex items-center gap-2">
          <span class="w-10 h-10 flex items-center justify-center text-lg font-bold bg-primary-dark text-white rounded-lg">
            {{ match.score1 }}
          </span>
          <span class="text-gray-400 font-bold">-</span>
          <span class="w-10 h-10 flex items-center justify-center text-lg font-bold bg-primary-dark text-white rounded-lg">
            {{ match.score2 }}
          </span>
        </div>
        <!-- User's prediction -->
        <div class="mt-1">
          <p class="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{{ $t('match.yourPrediction') }}</p>
          <div v-if="prediction" class="flex items-center justify-center gap-1.5 mt-0.5">
            <span :class="[
              'w-7 h-7 flex items-center justify-center text-sm font-bold rounded',
              prediction.points === 3 ? 'bg-accent/20 text-accent-dark' :
              prediction.points === 1 ? 'bg-blue-50 text-blue-700' :
              'bg-red-50 text-red-500'
            ]">
              {{ prediction.score1 }}
            </span>
            <span class="text-gray-300 text-xs">-</span>
            <span :class="[
              'w-7 h-7 flex items-center justify-center text-sm font-bold rounded',
              prediction.points === 3 ? 'bg-accent/20 text-accent-dark' :
              prediction.points === 1 ? 'bg-blue-50 text-blue-700' :
              'bg-red-50 text-red-500'
            ]">
              {{ prediction.score2 }}
            </span>
          </div>
          <p v-else class="text-xs text-gray-300 italic mt-0.5">{{ $t('match.noPrediction') }}</p>
        </div>
      </template>

      <!-- Not finished, read-only (user prediction or dashes) -->
      <template v-else>
        <div class="flex items-center gap-2">
          <span class="w-10 h-10 flex items-center justify-center text-lg font-bold bg-primary-dark text-white rounded-lg">
            {{ prediction?.score1 ?? '-' }}
          </span>
          <span class="text-gray-400 font-bold">-</span>
          <span class="w-10 h-10 flex items-center justify-center text-lg font-bold bg-primary-dark text-white rounded-lg">
            {{ prediction?.score2 ?? '-' }}
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
const justSaved = ref(false)
let savedTimeout: ReturnType<typeof setTimeout> | null = null

watch(() => props.prediction, (pred) => {
  if (pred) {
    score1.value = pred.score1
    score2.value = pred.score2
  }
})

function tryAutoSave() {
  if (score1.value == null || score2.value == null) return
  if (score1.value < 0 || score2.value < 0) return

  const s1 = score1.value
  const s2 = score2.value
  const pred = props.prediction
  if (pred && pred.score1 === s1 && pred.score2 === s2) return

  saving.value = true
  justSaved.value = false
  if (savedTimeout) clearTimeout(savedTimeout)

  emit('save', { matchId: props.match._id, score1: s1, score2: s2 })

  saving.value = false
  justSaved.value = true
  savedTimeout = setTimeout(() => {
    justSaved.value = false
  }, 2000)
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
