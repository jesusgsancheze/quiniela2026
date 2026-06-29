<template>
  <div>
    <p class="text-xs text-gray-400 mb-3 sm:hidden">{{ $t('knockoutDraw.scrollHint') }}</p>
    <div class="overflow-x-auto pb-4">
      <div ref="bracketRef" class="bracket relative flex gap-8 min-w-max">
        <svg
          class="absolute inset-0 pointer-events-none"
          :width="svg.w"
          :height="svg.h"
          :viewBox="`0 0 ${svg.w} ${svg.h}`"
          style="z-index:0"
        >
          <path v-for="(d, i) in connectors" :key="i" :d="d" fill="none" stroke="#cbd5e1" stroke-width="2" />
        </svg>

        <div v-for="stage in bracketStages" :key="stage" class="round relative flex flex-col min-w-[210px]" style="z-index:1">
          <p class="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-2 text-center">{{ stageLabel(stage) }}</p>
          <div class="col flex-1 flex flex-col justify-around">
            <div
              v-for="m in roundOrder[stage]"
              :key="m.matchNumber"
              :data-match="m.matchNumber"
              class="match bg-white border border-gray-200 rounded-lg shadow-sm my-2 overflow-hidden"
            >
              <div class="px-2 pt-1 text-[9px] text-gray-400 leading-tight">
                <div>{{ formatDate(m.date) }}</div>
                <div v-if="m.venue" class="truncate">{{ m.venue }}</div>
              </div>
              <div
                v-for="side in sides"
                :key="side"
                class="flex items-center gap-1.5 px-2 py-1 text-xs"
                :class="m.winnerSide === side ? 'bg-accent/15 font-bold text-primary-dark' : 'text-gray-600'"
              >
                <img v-if="teamOf(m, side)?.flagUrl" :src="teamOf(m, side)!.flagUrl!" class="w-5 h-3.5 object-cover rounded-sm shrink-0" />
                <div v-else class="w-5 h-3.5 rounded-sm bg-gray-100 shrink-0"></div>
                <span class="flex-1 truncate">{{ label(m, side) }}</span>
                <span v-if="m.score1 != null && m.score2 != null" class="tabular-nums">{{ side === 'team1' ? m.score1 : m.score2 }}</span>
              </div>
              <div v-if="m.note" class="text-[9px] text-gray-400 px-2 pb-1">{{ m.note }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Third place -->
    <div v-if="thirdPlace" class="mt-6 max-w-xs">
      <p class="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-2">{{ $t('matches.stageThird') }}</p>
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div class="px-2 pt-1 text-[9px] text-gray-400 leading-tight">
          <div>{{ formatDate(thirdPlace.date) }}</div>
          <div v-if="thirdPlace.venue" class="truncate">{{ thirdPlace.venue }}</div>
        </div>
        <div
          v-for="side in sides"
          :key="side"
          class="flex items-center gap-1.5 px-2 py-1 text-xs"
          :class="thirdPlace.winnerSide === side ? 'bg-accent/15 font-bold text-primary-dark' : 'text-gray-600'"
        >
          <img v-if="teamOf(thirdPlace, side)?.flagUrl" :src="teamOf(thirdPlace, side)!.flagUrl!" class="w-5 h-3.5 object-cover rounded-sm shrink-0" />
          <div v-else class="w-5 h-3.5 rounded-sm bg-gray-100 shrink-0"></div>
          <span class="flex-1 truncate">{{ label(thirdPlace, side) }}</span>
          <span v-if="thirdPlace.score1 != null && thirdPlace.score2 != null" class="tabular-nums">{{ side === 'team1' ? thirdPlace.score1 : thirdPlace.score2 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DrawMatch } from '~/types'

const props = defineProps<{ matches: DrawMatch[] }>()

const { t } = useI18n()
const bracketStages = ['round32', 'round16', 'quarter', 'semi', 'final']
const sides = ['team1', 'team2'] as const

const bracketRef = ref<HTMLElement | null>(null)
const connectors = ref<string[]>([])
const svg = ref({ w: 0, h: 0 })
let ro: ResizeObserver | null = null

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    round32: t('matches.stageRoundOf32'), round16: t('matches.stageRoundOf16'),
    quarter: t('matches.stageQuarter'), semi: t('matches.stageSemi'),
    final: t('matches.stageFinal'),
  }
  return map[stage] || stage
}
function formatDate(s: string): string {
  if (!s) return ''
  return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const byNum = computed(() => {
  const map: Record<number, DrawMatch> = {}
  for (const m of props.matches) map[m.matchNumber] = m
  return map
})
const thirdPlace = computed(() => props.matches.find((m) => m.stage === 'third') || null)

const wRe = /^W(\d+)$/
function feeders(m: DrawMatch): number[] {
  return [m.placeholder1, m.placeholder2]
    .map((ph) => wRe.exec((ph || '').toUpperCase()))
    .filter(Boolean)
    .map((x) => Number(x![1]))
}

const minLeaf = computed(() => {
  const memo: Record<number, number> = {}
  let counter = 0
  const dfs = (m: DrawMatch): number => {
    const fs = feeders(m)
    if (fs.length === 0) { memo[m.matchNumber] = counter; return counter++ }
    let mn = Infinity
    for (const n of fs) {
      const child = byNum.value[n]
      if (child) mn = Math.min(mn, dfs(child))
    }
    memo[m.matchNumber] = mn
    return mn
  }
  const final = props.matches.find((m) => m.stage === 'final')
  if (final) dfs(final)
  props.matches.forEach((m) => { if (memo[m.matchNumber] == null) memo[m.matchNumber] = m.matchNumber })
  return memo
})

const roundOrder = computed(() => {
  const out: Record<string, DrawMatch[]> = {}
  for (const stage of bracketStages) {
    out[stage] = props.matches
      .filter((m) => m.stage === stage)
      .sort((a, b) => (minLeaf.value[a.matchNumber] ?? 0) - (minLeaf.value[b.matchNumber] ?? 0))
  }
  return out
})

function teamOf(m: DrawMatch, side: 'team1' | 'team2') {
  return side === 'team1' ? m.team1 : m.team2
}
function label(m: DrawMatch, side: 'team1' | 'team2'): string {
  const tm = teamOf(m, side)
  return tm?.code || tm?.name || (side === 'team1' ? m.placeholder1 : m.placeholder2) || 'TBD'
}

function computeConnectors() {
  const root = bracketRef.value
  if (!root) return
  const brect = root.getBoundingClientRect()
  const els = new Map<number, DOMRect>()
  root.querySelectorAll<HTMLElement>('[data-match]').forEach((el) => {
    els.set(Number(el.dataset.match), el.getBoundingClientRect())
  })
  const paths: string[] = []
  for (const m of props.matches) {
    if (m.stage === 'third') continue
    const cr = els.get(m.matchNumber)
    if (!cr) continue
    const cLeft = cr.left - brect.left
    const cMid = cr.top - brect.top + cr.height / 2
    for (const n of feeders(m)) {
      const fr = els.get(n)
      if (!fr) continue
      const fRight = fr.right - brect.left
      const fMid = fr.top - brect.top + fr.height / 2
      const midX = (fRight + cLeft) / 2
      paths.push(`M ${fRight} ${fMid} H ${midX} V ${cMid} H ${cLeft}`)
    }
  }
  connectors.value = paths
  svg.value = { w: root.scrollWidth, h: root.scrollHeight }
}

watch(() => props.matches, () => nextTick(() => requestAnimationFrame(computeConnectors)), { deep: true })

onMounted(async () => {
  await nextTick()
  computeConnectors()
  requestAnimationFrame(computeConnectors)
  if (bracketRef.value && 'ResizeObserver' in window) {
    ro = new ResizeObserver(() => computeConnectors())
    ro.observe(bracketRef.value)
  }
  window.addEventListener('resize', computeConnectors)
})

onUnmounted(() => {
  if (ro) ro.disconnect()
  window.removeEventListener('resize', computeConnectors)
})
</script>
