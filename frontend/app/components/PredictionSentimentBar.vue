<template>
  <div>
    <template v-if="total > 0">
      <div class="flex h-2 rounded-full overflow-hidden bg-gray-100">
        <div
          v-if="pct.team1"
          class="bg-primary"
          :style="{ width: pct.team1 + '%' }"
        />
        <div
          v-if="pct.draw"
          class="bg-gray-400"
          :style="{ width: pct.draw + '%' }"
        />
        <div
          v-if="pct.team2"
          class="bg-accent"
          :style="{ width: pct.team2 + '%' }"
        />
      </div>
      <div class="flex justify-between text-[10px] mt-1 tabular-nums">
        <span class="font-semibold text-primary truncate max-w-[33%]">
          {{ team1Label }} {{ pct.team1 }}%
        </span>
        <span class="text-gray-500 truncate max-w-[34%] text-center">
          {{ drawLabel }} {{ pct.draw }}%
        </span>
        <span class="font-semibold text-accent-dark truncate max-w-[33%] text-right">
          {{ team2Label }} {{ pct.team2 }}%
        </span>
      </div>
    </template>
    <p v-else class="text-[10px] text-gray-300">{{ emptyLabel }}</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  team1: number
  draw: number
  team2: number
  team1Label: string
  team2Label: string
  drawLabel: string
  emptyLabel: string
}>()

const total = computed(() => props.team1 + props.draw + props.team2)

const pct = computed(() => {
  const tot = total.value
  if (tot === 0) return { team1: 0, draw: 0, team2: 0 }
  const r1 = Math.round((props.team1 / tot) * 100)
  const r2 = Math.round((props.team2 / tot) * 100)
  // Force the three segments to sum to exactly 100%.
  return { team1: r1, team2: r2, draw: 100 - r1 - r2 }
})
</script>
