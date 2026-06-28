<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <h1 class="text-3xl font-bold text-primary">{{ $t('knockoutDraw.title') }}</h1>
      <NuxtLink to="/knockout/matches" class="btn-secondary text-sm px-4 py-2 self-start">{{ $t('knockoutDraw.viewMatches') }}</NuxtLink>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-500">{{ $t('knockout.loading') }}</div>

    <template v-else>
      <p class="text-xs text-gray-400 mb-3 sm:hidden">{{ $t('knockoutDraw.scrollHint') }}</p>
      <div class="overflow-x-auto pb-4">
        <div ref="bracketRef" class="bracket relative flex gap-8 min-w-max">
          <!-- Connector overlay -->
          <svg
            class="absolute inset-0 pointer-events-none"
            :width="svg.w"
            :height="svg.h"
            :viewBox="`0 0 ${svg.w} ${svg.h}`"
            style="z-index:0"
          >
            <path
              v-for="(d, i) in connectors"
              :key="i"
              :d="d"
              fill="none"
              stroke="#cbd5e1"
              stroke-width="2"
            />
          </svg>

          <div v-for="stage in bracketStages" :key="stage" class="round relative flex flex-col min-w-[190px]" style="z-index:1">
            <p class="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-2 text-center">{{ stageLabel(stage) }}</p>
            <div class="col flex-1 flex flex-col justify-around">
              <div
                v-for="m in roundOrder[stage]"
                :key="m.matchId"
                :data-match="m.matchNumber"
                class="match bg-white border border-gray-200 rounded-lg shadow-sm my-2 overflow-hidden"
              >
                <div
                  v-for="side in sides"
                  :key="side"
                  class="flex items-center gap-1.5 px-2 py-1.5 text-xs"
                  :class="winner(m) === side ? 'bg-accent/15 font-bold text-primary-dark' : 'text-gray-600'"
                >
                  <img v-if="teamOf(m, side)?.flagUrl" :src="teamOf(m, side)!.flagUrl!" class="w-5 h-3.5 object-cover rounded-sm shrink-0" />
                  <div v-else class="w-5 h-3.5 rounded-sm bg-gray-100 shrink-0"></div>
                  <span class="flex-1 truncate">{{ label(m, side) }}</span>
                  <span v-if="m.status === 'finished'" class="tabular-nums">{{ side === 'team1' ? m.score1 : m.score2 }}</span>
                </div>
                <div v-if="m.decidedOnPenalties" class="text-[9px] text-gray-400 px-2 pb-1">{{ pkLabel(m) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Third place -->
      <div v-if="thirdPlace" class="mt-6 max-w-xs">
        <p class="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-2">{{ $t('matches.stageThird') }}</p>
        <div class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div
            v-for="side in sides"
            :key="side"
            class="flex items-center gap-1.5 px-2 py-1.5 text-xs"
            :class="winner(thirdPlace) === side ? 'bg-accent/15 font-bold text-primary-dark' : 'text-gray-600'"
          >
            <img v-if="teamOf(thirdPlace, side)?.flagUrl" :src="teamOf(thirdPlace, side)!.flagUrl!" class="w-5 h-3.5 object-cover rounded-sm shrink-0" />
            <div v-else class="w-5 h-3.5 rounded-sm bg-gray-100 shrink-0"></div>
            <span class="flex-1 truncate">{{ label(thirdPlace, side) }}</span>
            <span v-if="thirdPlace.status === 'finished'" class="tabular-nums">{{ side === 'team1' ? thirdPlace.score1 : thirdPlace.score2 }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { KnockoutPublicMatch } from '~/types'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const { apiFetch } = useApi()
const matches = ref<KnockoutPublicMatch[]>([])
const loading = ref(true)

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

const byNum = computed(() => {
  const map: Record<number, KnockoutPublicMatch> = {}
  for (const m of matches.value) map[m.matchNumber] = m
  return map
})
const thirdPlace = computed(() => matches.value.find((m) => m.stage === 'third') || null)

const wRe = /^W(\d+)$/
function feeders(m: KnockoutPublicMatch): number[] {
  return [m.placeholder1, m.placeholder2]
    .map((ph) => wRe.exec((ph || '').toUpperCase()))
    .filter(Boolean)
    .map((x) => Number(x![1]))
}

// DFS from the Final orders each R32 leaf so siblings sit adjacent.
const minLeaf = computed(() => {
  const memo: Record<number, number> = {}
  let counter = 0
  const dfs = (m: KnockoutPublicMatch): number => {
    const fs = feeders(m)
    if (fs.length === 0) {
      memo[m.matchNumber] = counter
      return counter++
    }
    let mn = Infinity
    for (const n of fs) {
      const child = byNum.value[n]
      if (child) mn = Math.min(mn, dfs(child))
    }
    memo[m.matchNumber] = mn
    return mn
  }
  const final = matches.value.find((m) => m.stage === 'final')
  if (final) dfs(final)
  matches.value.forEach((m) => {
    if (memo[m.matchNumber] == null) memo[m.matchNumber] = m.matchNumber
  })
  return memo
})

const roundOrder = computed(() => {
  const out: Record<string, KnockoutPublicMatch[]> = {}
  for (const stage of bracketStages) {
    out[stage] = matches.value
      .filter((m) => m.stage === stage)
      .sort((a, b) => (minLeaf.value[a.matchNumber] ?? 0) - (minLeaf.value[b.matchNumber] ?? 0))
  }
  return out
})

function teamOf(m: KnockoutPublicMatch, side: 'team1' | 'team2') {
  return side === 'team1' ? m.team1 : m.team2
}
function label(m: KnockoutPublicMatch, side: 'team1' | 'team2'): string {
  const tm = teamOf(m, side)
  return tm?.code || tm?.name || (side === 'team1' ? m.placeholder1 : m.placeholder2) || 'TBD'
}
function winner(m: KnockoutPublicMatch): 'team1' | 'team2' | null {
  if (m.status !== 'finished' || m.live || m.score1 == null || m.score2 == null) return null
  if (m.score1 > m.score2) return 'team1'
  if (m.score1 < m.score2) return 'team2'
  return m.decidedOnPenalties ? m.penaltyWinner : null
}
function pkLabel(m: KnockoutPublicMatch): string {
  const tm = m.penaltyWinner === 'team1' ? m.team1 : m.team2
  return t('knockout.wonOnPens', { team: tm?.code || tm?.name || '' })
}

// Draw elbow connectors from each match's two feeders into the match, using
// the real on-screen positions of the cards (robust to varying heights).
function computeConnectors() {
  const root = bracketRef.value
  if (!root) return
  const brect = root.getBoundingClientRect()
  const els = new Map<number, DOMRect>()
  root.querySelectorAll<HTMLElement>('[data-match]').forEach((el) => {
    els.set(Number(el.dataset.match), el.getBoundingClientRect())
  })
  const paths: string[] = []
  for (const m of matches.value) {
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

function scheduleCompute() {
  nextTick(() => requestAnimationFrame(computeConnectors))
}

watch(matches, scheduleCompute)

onMounted(async () => {
  try {
    matches.value = await apiFetch<KnockoutPublicMatch[]>('/api/knockout/matches')
  } finally {
    loading.value = false
  }
  // Wait for the bracket DOM (rendered once loading flips) before measuring.
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
