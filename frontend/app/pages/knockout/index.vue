<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 class="text-3xl font-bold text-primary">{{ $t('knockout.title') }}</h1>
        <p class="text-gray-500 text-sm mt-1">{{ $t('knockout.subtitle') }}</p>
      </div>
      <div class="flex gap-2 self-start">
        <button
          v-if="bracket?.entryId"
          class="btn-outline text-sm px-4 py-2"
          @click="drawOpen = true"
        >
          {{ $t('knockout.viewAsDraw') }}
        </button>
        <NuxtLink to="/knockout/standings" class="btn-secondary text-sm px-4 py-2">
          {{ $t('knockout.viewStandings') }}
        </NuxtLink>
      </div>
    </div>

    <BracketModal
      :open="drawOpen"
      :entry-id="bracket?.entryId ?? null"
      :title="$t('knockout.myBracket')"
      @close="drawOpen = false"
    />

    <div v-if="loading" class="text-center py-12 text-gray-500">{{ $t('knockout.loading') }}</div>

    <!-- Not joined / payment not confirmed -->
    <div v-else-if="!bracket || bracket.paymentStatus !== 'confirmed'" class="card max-w-xl mx-auto text-center py-10">
      <h2 class="text-xl font-semibold text-primary mb-2">{{ $t('knockout.joinTitle') }}</h2>
      <p class="text-gray-500 text-sm mb-6">{{ $t('knockout.joinDesc') }}</p>

      <template v-if="!bracket?.entryId">
        <button :disabled="busy" class="btn-accent px-5 py-2 disabled:opacity-50" @click="joinPhase2">
          {{ $t('knockout.joinCta') }}
        </button>
      </template>
      <template v-else-if="bracket.paymentStatus === 'pending'">
        <p class="text-sm text-gray-600 mb-3">{{ $t('knockout.reportHint') }}</p>
        <textarea
          v-model="paymentNote"
          :placeholder="$t('knockout.reportPlaceholder')"
          class="input-field w-full mb-3 text-sm"
          rows="3"
        ></textarea>
        <button :disabled="busy" class="btn-accent px-5 py-2 disabled:opacity-50" @click="reportPayment">
          {{ $t('knockout.reportCta') }}
        </button>
        <p class="text-xs text-gray-400 mt-3">
          {{ $t('knockout.paymentDetailsLink') }}
          <NuxtLink to="/payment" class="text-primary underline">{{ $t('nav.payment') }}</NuxtLink>
        </p>
      </template>
      <template v-else-if="bracket.paymentStatus === 'reported'">
        <div class="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-3 text-sm">
          {{ $t('knockout.reportedWaiting') }}
        </div>
      </template>
    </div>

    <!-- Bracket -->
    <div v-else>
      <div
        v-if="bracket.locked"
        class="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6 text-sm"
      >
        {{ $t('knockout.lockedBanner') }}
      </div>
      <div v-else class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6 text-sm">
        {{ $t('knockout.openBanner', { date: formatDate(bracket.deadline) }) }}
      </div>

      <div v-for="stage in stageOrder" :key="stage" class="mb-8">
        <h2 class="text-lg font-semibold text-primary-dark mb-3 border-b-2 border-accent pb-2">
          {{ stageLabel(stage) }}
        </h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <div v-for="m in matchesByStage(stage)" :key="m.matchId" class="card">
            <div class="flex items-center justify-between text-[11px] text-gray-400 mb-2">
              <span>#{{ m.matchNumber }} · {{ formatDate(m.date) }}</span>
              <span v-if="m.status === 'finished'" class="flex items-center gap-1.5 font-semibold uppercase">
                <span v-if="m.live" class="flex items-center gap-1 text-amber-600">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>{{ $t('matches.live') }}
                </span>
                <span v-else class="text-green-600">{{ $t('matches.finished') }}</span>
                <span class="text-gray-600">{{ m.score1 }}-{{ m.score2 }}</span>
                <span v-if="m.decidedOnPenalties" class="text-gray-500 normal-case">({{ pkLabel(m) }})</span>
              </span>
              <span v-else-if="hasStarted(m) && !bracket.locked" class="text-amber-600 font-semibold uppercase">
                {{ $t('knockout.started') }}
              </span>
            </div>

            <!-- Team rows -->
            <div class="space-y-2">
              <div
                v-for="side in sides"
                :key="side"
                class="flex items-center gap-2"
                :class="local[m.matchId]?.advances === side ? 'font-semibold' : ''"
              >
                <img
                  v-if="teamFor(m, side)?.flagUrl"
                  :src="teamFor(m, side)!.flagUrl!"
                  class="w-7 h-5 object-cover rounded shadow-sm shrink-0"
                />
                <div v-else class="w-7 h-5 rounded bg-gray-100 shrink-0"></div>
                <span class="flex-1 truncate text-sm text-primary">{{ teamName(m, side) }}</span>
                <input
                  v-model.number="local[m.matchId][side === 'team1' ? 'score1' : 'score2']"
                  type="number"
                  min="0"
                  :disabled="isLocked(m)"
                  class="input-field w-14 text-center text-sm py-1"
                  @change="onEdit(m)"
                />
              </div>
            </div>

            <!-- Penalty winner picker (only when scores are level) -->
            <div v-if="isTie(m)" class="mt-3">
              <p class="text-[11px] uppercase tracking-wider text-gray-400 mb-1">{{ $t('knockout.penaltyPrompt') }}</p>
              <div class="flex gap-2">
                <button
                  v-for="side in sides"
                  :key="side"
                  type="button"
                  :disabled="isLocked(m) || !teamFor(m, side)"
                  class="flex-1 text-xs px-2 py-1.5 rounded border transition-colors disabled:opacity-40"
                  :class="local[m.matchId]?.advances === side
                    ? 'bg-primary text-white border-primary'
                    : 'border-gray-200 text-gray-600 hover:border-primary'"
                  @click="setAdvance(m, side)"
                >
                  {{ teamName(m, side) }}
                </button>
              </div>
            </div>

            <div class="mt-3 flex items-center justify-between min-h-[20px]">
              <span
                v-if="m.prediction?.points != null"
                class="text-xs font-semibold"
                :class="m.prediction.points > 0 ? 'text-green-600' : 'text-gray-400'"
              >
                +{{ m.prediction.points }} {{ $t('positions.points') }}
              </span>
              <span v-else class="text-xs text-gray-400">
                {{ local[m.matchId]?.advances ? $t('knockout.advancesLabel', { team: teamName(m, local[m.matchId].advances) }) : '' }}
              </span>
              <span v-if="status[m.matchId] === 'saving'" class="text-xs text-gray-400">{{ $t('knockout.saving') }}</span>
              <span v-else-if="status[m.matchId] === 'saved'" class="text-xs text-green-600">{{ $t('knockout.saved') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { KnockoutBracket, KnockoutBracketMatch, TeamLite } from '~/types'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const { apiFetch } = useApi()
const toast = useToast()

const loading = ref(true)
const busy = ref(false)
const bracket = ref<KnockoutBracket | null>(null)
const paymentNote = ref('')
const drawOpen = ref(false)
// Per-match autosave indicator: 'saving' | 'saved' | undefined
const status = reactive<Record<string, 'saving' | 'saved' | undefined>>({})

const stageOrder = ['round32', 'round16', 'quarter', 'semi', 'third', 'final']
const sides = ['team1', 'team2'] as const

// Ticking clock so picks disable themselves the moment a match kicks off.
const now = ref(Date.now())
let nowTimer: ReturnType<typeof setInterval> | null = null

function hasStarted(m: KnockoutBracketMatch): boolean {
  return new Date(m.date).getTime() <= now.value
}

// A pick is locked once the global deadline passes, the match kicks off, or a
// result has already been entered for it.
function isLocked(m: KnockoutBracketMatch): boolean {
  return !!bracket.value?.locked || hasStarted(m) || m.status === 'finished'
}

type LocalPick = { score1: number | null; score2: number | null; advances: 'team1' | 'team2' | null }
const local = reactive<Record<string, LocalPick>>({})

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    round32: t('matches.stageRoundOf32'),
    round16: t('matches.stageRoundOf16'),
    quarter: t('matches.stageQuarter'),
    semi: t('matches.stageSemi'),
    third: t('matches.stageThird'),
    final: t('matches.stageFinal'),
  }
  return map[stage] || stage
}

function matchesByStage(stage: string): KnockoutBracketMatch[] {
  return (bracket.value?.matches || [])
    .filter((m) => m.stage === stage)
    .sort((a, b) => a.matchNumber - b.matchNumber)
}

function teamFor(m: KnockoutBracketMatch, side: 'team1' | 'team2'): TeamLite | null {
  return side === 'team1' ? m.myTeam1 : m.myTeam2
}

function teamName(m: KnockoutBracketMatch, side: 'team1' | 'team2'): string {
  const tm = teamFor(m, side)
  if (tm) return tm.name
  return (side === 'team1' ? m.placeholder1 : m.placeholder2) || 'TBD'
}

function bothScores(m: KnockoutBracketMatch): boolean {
  const l = local[m.matchId]
  return !!l && Number.isFinite(l.score1) && Number.isFinite(l.score2)
}

function isTie(m: KnockoutBracketMatch): boolean {
  const l = local[m.matchId]
  return bothScores(m) && l.score1 === l.score2
}

const wlRe = /^([WL])(\d+)$/

// Propagate each player's picks forward so later-round teams update instantly,
// without a server round-trip. Mirrors the backend's bracket derivation.
function recomputeBracket() {
  const matches = bracket.value?.matches || []
  const byNum: Record<number, KnockoutBracketMatch> = {}
  for (const m of matches) byNum[m.matchNumber] = m

  const sideTeam = (m: KnockoutBracketMatch, slot: 'team1' | 'team2'): TeamLite | null => {
    const ph = (slot === 'team1' ? m.placeholder1 : m.placeholder2) || ''
    const wl = wlRe.exec(ph.trim().toUpperCase())
    if (wl) {
      const src = byNum[Number(wl[2])]
      if (!src) return null
      const adv = local[src.matchId]?.advances
      if (!adv) return null
      const winner = adv === 'team1' ? src.myTeam1 : src.myTeam2
      const loser = adv === 'team1' ? src.myTeam2 : src.myTeam1
      return wl[1] === 'W' ? winner : loser
    }
    // Round of 32 group feeder — use the actual resolved team.
    return slot === 'team1' ? m.actualTeam1 : m.actualTeam2
  }

  for (const m of [...matches].sort((a, b) => a.matchNumber - b.matchNumber)) {
    m.myTeam1 = sideTeam(m, 'team1')
    m.myTeam2 = sideTeam(m, 'team2')
  }
}

function pkLabel(m: KnockoutBracketMatch): string {
  const side = m.penaltyWinner
  if (!side) return t('knockout.penalties')
  const tm = side === 'team1' ? m.actualTeam1 : m.actualTeam2
  return t('knockout.wonOnPens', { team: tm?.code || tm?.name || '' })
}

// When a score changes: decisive results autosave immediately; a tie clears the
// advancing side and waits for the player to pick the penalty winner.
function onEdit(m: KnockoutBracketMatch) {
  const l = local[m.matchId]
  if (bothScores(m)) {
    if (l.score1! > l.score2!) l.advances = 'team1'
    else if (l.score1! < l.score2!) l.advances = 'team2'
    else l.advances = null // tie — needs an explicit penalty pick
  }
  recomputeBracket()
  if (canSave(m)) autoSave(m)
}

function setAdvance(m: KnockoutBracketMatch, side: 'team1' | 'team2') {
  local[m.matchId].advances = side
  recomputeBracket()
  if (canSave(m)) autoSave(m)
}

function canSave(m: KnockoutBracketMatch): boolean {
  const l = local[m.matchId]
  if (!l || !bothScores(m)) return false
  if (!teamFor(m, 'team1') || !teamFor(m, 'team2')) return false // teams not known yet upstream
  return l.advances === 'team1' || l.advances === 'team2'
}

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function syncLocal() {
  for (const m of bracket.value?.matches || []) {
    const p = m.prediction
    local[m.matchId] = {
      score1: p ? p.score1 : null,
      score2: p ? p.score2 : null,
      advances: p ? p.advances : null,
    }
  }
}

async function load() {
  try {
    bracket.value = await apiFetch<KnockoutBracket>('/api/knockout/bracket')
    syncLocal()
    recomputeBracket()
  } catch (e: any) {
    toast.error(e?.data?.message || t('knockout.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function joinPhase2() {
  busy.value = true
  try {
    await apiFetch('/api/knockout/entries/new', { method: 'POST' })
    await load()
  } catch (e: any) {
    toast.error(e?.data?.message || t('knockout.joinFailed'))
  } finally {
    busy.value = false
  }
}

async function reportPayment() {
  busy.value = true
  try {
    await apiFetch('/api/knockout/entries/me/report', {
      method: 'PATCH',
      body: { note: paymentNote.value },
    })
    await load()
    toast.success(t('knockout.reportSuccess'))
  } catch (e: any) {
    toast.error(e?.data?.message || t('knockout.reportFailed'))
  } finally {
    busy.value = false
  }
}

// Background autosave — no full reload, so other in-progress picks are kept.
// Later-round teams already updated locally via recomputeBracket().
async function autoSave(m: KnockoutBracketMatch) {
  if (isLocked(m) || !canSave(m)) return
  const l = local[m.matchId]
  status[m.matchId] = 'saving'
  try {
    await apiFetch('/api/knockout/predictions', {
      method: 'PUT',
      body: {
        matchId: m.matchId,
        score1: l.score1,
        score2: l.score2,
        advances: l.advances,
        entryId: bracket.value?.entryId,
      },
    })
    status[m.matchId] = 'saved'
    setTimeout(() => {
      if (status[m.matchId] === 'saved') status[m.matchId] = undefined
    }, 1500)
  } catch (e: any) {
    status[m.matchId] = undefined
    toast.error(e?.data?.message || t('knockout.saveFailed'))
  }
}

onMounted(() => {
  load()
  nowTimer = setInterval(() => (now.value = Date.now()), 30000)
})
onUnmounted(() => {
  if (nowTimer) clearInterval(nowTimer)
})
</script>
