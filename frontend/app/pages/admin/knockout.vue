<template>
  <div>
    <h1 class="text-3xl font-bold text-primary mb-6">{{ $t('adminKnockout.title') }}</h1>

    <!-- Bracket controls -->
    <div class="card mb-8">
      <h2 class="font-semibold text-primary mb-1">{{ $t('adminKnockout.bracketControls') }}</h2>
      <p class="text-xs text-gray-400 mb-4">{{ $t('adminKnockout.bracketControlsHint') }}</p>
      <div class="flex flex-wrap gap-2">
        <button :disabled="busy" class="btn-accent text-sm px-4 py-2 disabled:opacity-50" @click="resolveR32">
          {{ $t('adminKnockout.resolveR32') }}
        </button>
        <button :disabled="busy" class="btn-secondary text-sm px-4 py-2 disabled:opacity-50" @click="progress">
          {{ $t('adminKnockout.progress') }}
        </button>
        <button :disabled="busy" class="btn-outline text-sm px-4 py-2 disabled:opacity-50" @click="recalc">
          {{ $t('adminKnockout.recalc') }}
        </button>
      </div>
    </div>

    <!-- Phase 2 payments -->
    <div class="card mb-8">
      <h2 class="font-semibold text-primary mb-4">{{ $t('adminKnockout.payments') }}</h2>
      <div v-if="entries.length === 0" class="text-sm text-gray-400">{{ $t('adminKnockout.noEntries') }}</div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-left text-[11px] uppercase text-gray-400 border-b border-gray-100">
            <th class="py-2 pr-2">{{ $t('positions.player') }}</th>
            <th class="py-2 px-2 text-center">{{ $t('positions.entry') }}</th>
            <th class="py-2 px-2 text-center">{{ $t('admin.players.progress') }}</th>
            <th class="py-2 px-2 text-center">{{ $t('admin.players.payment') }}</th>
            <th class="py-2 pl-2 text-right"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in entries" :key="e._id" class="border-b border-gray-50">
            <td class="py-2 pr-2">{{ userName(e.user) }}</td>
            <td class="py-2 px-2 text-center">#{{ e.entryNumber }}</td>
            <td class="py-2 px-2">
              <div v-if="e.progress" class="min-w-[110px] mx-auto">
                <div class="flex justify-between text-[11px] text-gray-500 mb-1">
                  <span>{{ e.progress.filled }}/{{ e.progress.total }}</span>
                  <span class="font-semibold" :class="e.progress.percentage === 100 ? 'text-green-600' : 'text-accent'">{{ e.progress.percentage }}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div class="rounded-full h-2 transition-all duration-300" :class="e.progress.percentage === 100 ? 'bg-green-500' : 'bg-accent'" :style="{ width: `${e.progress.percentage}%` }"></div>
                </div>
              </div>
            </td>
            <td class="py-2 px-2 text-center">
              <span :class="[
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                e.paymentStatus === 'confirmed' ? 'bg-green-100 text-green-800' :
                e.paymentStatus === 'reported' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
              ]">{{ e.paymentStatus }}</span>
            </td>
            <td class="py-2 pl-2 text-right">
              <div v-if="e.paymentStatus === 'reported'" class="inline-flex gap-2">
                <button class="text-green-600 hover:text-green-800 text-xs font-semibold" @click="confirmEntry(e._id)">
                  {{ $t('admin.players.confirmPayment') }}
                </button>
                <button class="text-red-500 hover:text-red-700 text-xs font-semibold" @click="rejectEntry(e._id)">
                  {{ $t('admin.players.rejectPayment') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Matches -->
    <div v-if="loading" class="text-center py-12 text-gray-500">{{ $t('knockout.loading') }}</div>
    <div v-else v-for="stage in stageOrder" :key="stage" class="mb-8">
      <h2 class="text-lg font-semibold text-primary-dark mb-3 border-b-2 border-accent pb-2">{{ stageLabel(stage) }}</h2>
      <div class="grid gap-3 lg:grid-cols-2">
        <div v-for="m in matchesByStage(stage)" :key="m.matchId" class="card">
          <div class="flex items-center justify-between text-[11px] text-gray-400 mb-2">
            <span>#{{ m.matchNumber }} · {{ m.placeholder1 }} vs {{ m.placeholder2 }}</span>
            <span v-if="m.status === 'finished'" class="text-green-600 font-semibold">
              {{ m.score1 }}-{{ m.score2 }}<span v-if="m.decidedOnPenalties"> · {{ $t('knockout.penalties') }} ({{ m.penaltyWinner }})</span>
            </span>
          </div>

          <!-- Override teams -->
          <div class="grid grid-cols-2 gap-2 mb-3">
            <select v-model="form[m.matchId].team1Id" class="input-field text-xs py-1">
              <option value="">{{ teamDisplay(m.actualTeam1, m.placeholder1) }}</option>
              <option v-for="t in allTeams" :key="t._id" :value="t._id">{{ t.name }}</option>
            </select>
            <select v-model="form[m.matchId].team2Id" class="input-field text-xs py-1">
              <option value="">{{ teamDisplay(m.actualTeam2, m.placeholder2) }}</option>
              <option v-for="t in allTeams" :key="t._id" :value="t._id">{{ t.name }}</option>
            </select>
          </div>
          <button class="btn-outline text-xs px-3 py-1 mb-3" @click="overrideTeams(m)">
            {{ $t('adminKnockout.overrideTeams') }}
          </button>

          <!-- Result entry -->
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs text-gray-500 flex-1 truncate">{{ teamDisplay(m.actualTeam1, m.placeholder1) }}</span>
            <input v-model.number="form[m.matchId].score1" type="number" min="0" class="input-field w-14 text-center text-sm py-1" />
            <span class="text-gray-300">-</span>
            <input v-model.number="form[m.matchId].score2" type="number" min="0" class="input-field w-14 text-center text-sm py-1" />
            <span class="text-xs text-gray-500 flex-1 truncate text-right">{{ teamDisplay(m.actualTeam2, m.placeholder2) }}</span>
          </div>

          <div v-if="formIsTie(m)" class="mb-2">
            <p class="text-[11px] uppercase text-gray-400 mb-1">{{ $t('adminKnockout.penaltyWinner') }} <span class="normal-case text-gray-300">({{ $t('adminKnockout.penaltyWinnerHint') }})</span></p>
            <div class="flex gap-2">
              <button
                v-for="side in sides"
                :key="side"
                type="button"
                class="flex-1 text-xs px-2 py-1 rounded border"
                :class="form[m.matchId].penaltyWinner === side ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600'"
                @click="form[m.matchId].penaltyWinner = side"
              >
                {{ teamDisplay(side === 'team1' ? m.actualTeam1 : m.actualTeam2, side === 'team1' ? m.placeholder1 : m.placeholder2) }}
              </button>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              :disabled="!canSaveResult(m, true)"
              class="text-xs px-3 py-1 rounded-lg font-semibold border-2 border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-40"
              @click="saveResult(m, true)"
            >
              {{ $t('adminKnockout.saveLive') }}
            </button>
            <button :disabled="!canSaveResult(m, false)" class="btn-accent text-xs px-3 py-1 disabled:opacity-40" @click="saveResult(m, false)">
              {{ $t('adminKnockout.saveFinal') }}
            </button>
            <button v-if="m.status === 'finished'" class="btn-outline text-xs px-3 py-1" @click="clearResult(m)">
              {{ $t('adminKnockout.clearResult') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { KnockoutBracket, KnockoutBracketMatch, KnockoutEntry, TeamLite, Group, User } from '~/types'

definePageMeta({ middleware: 'admin' })

const { t } = useI18n()
const { apiFetch } = useApi()
const toast = useToast()

const loading = ref(true)
const busy = ref(false)
const bracket = ref<KnockoutBracket | null>(null)
const entries = ref<KnockoutEntry[]>([])
const users = ref<User[]>([])
const allTeams = ref<TeamLite[]>([])

const stageOrder = ['round32', 'round16', 'quarter', 'semi', 'third', 'final']
const sides = ['team1', 'team2'] as const

type ResultForm = {
  team1Id: string; team2Id: string
  score1: number | null; score2: number | null
  penaltyWinner: 'team1' | 'team2' | null
}
const form = reactive<Record<string, ResultForm>>({})

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    round32: t('matches.stageRoundOf32'), round16: t('matches.stageRoundOf16'),
    quarter: t('matches.stageQuarter'), semi: t('matches.stageSemi'),
    third: t('matches.stageThird'), final: t('matches.stageFinal'),
  }
  return map[stage] || stage
}
function matchesByStage(stage: string): KnockoutBracketMatch[] {
  return (bracket.value?.matches || []).filter((m) => m.stage === stage).sort((a, b) => a.matchNumber - b.matchNumber)
}
function teamDisplay(tm: TeamLite | null, placeholder: string | null): string {
  return tm?.name || placeholder || 'TBD'
}
function userName(userId: string): string {
  const u = users.value.find((x) => (x._id || x.id) === userId)
  return u ? `${u.firstName} ${u.lastName}` : userId
}
function formIsTie(m: KnockoutBracketMatch): boolean {
  const f = form[m.matchId]
  return f.score1 != null && f.score2 != null && f.score1 === f.score2
}
function canSaveResult(m: KnockoutBracketMatch, live: boolean): boolean {
  const f = form[m.matchId]
  if (f.score1 == null || f.score2 == null) return false
  // A final tie needs a penalty winner; a live tie does not.
  if (!live && f.score1 === f.score2 && !f.penaltyWinner) return false
  return true
}

function syncForm() {
  for (const m of bracket.value?.matches || []) {
    form[m.matchId] = {
      team1Id: '',
      team2Id: '',
      score1: m.score1,
      score2: m.score2,
      penaltyWinner: m.penaltyWinner,
    }
  }
}

async function loadBracket() {
  bracket.value = await apiFetch<KnockoutBracket>('/api/knockout/bracket')
  syncForm()
}

async function loadAll() {
  try {
    const [, groups, ent, us] = await Promise.all([
      loadBracket(),
      apiFetch<Group[]>('/api/groups'),
      apiFetch<KnockoutEntry[]>('/api/knockout/entries'),
      apiFetch<User[]>('/api/users'),
    ])
    allTeams.value = groups
      .flatMap((g) => g.teams || [])
      .map((tm) => ({ _id: tm._id, name: tm.name, code: tm.code, flagUrl: tm.flagUrl }))
      .sort((a, b) => a.name.localeCompare(b.name))
    entries.value = ent
    users.value = us
  } catch (e: any) {
    toast.error(e?.data?.message || 'Failed to load')
  } finally {
    loading.value = false
  }
}

async function run(fn: () => Promise<any>, okMsg?: string) {
  busy.value = true
  try {
    await fn()
    await loadBracket()
    if (okMsg) toast.success(okMsg)
  } catch (e: any) {
    toast.error(e?.data?.message || 'Action failed')
  } finally {
    busy.value = false
  }
}

const resolveR32 = () => run(() => apiFetch('/api/knockout/bracket/resolve-r32', { method: 'POST' }), t('adminKnockout.resolvedOk'))
const progress = () => run(() => apiFetch('/api/knockout/bracket/progress', { method: 'POST' }), t('adminKnockout.progressedOk'))
const recalc = () => run(() => apiFetch('/api/knockout/recalc', { method: 'POST' }), t('adminKnockout.recalcOk'))

function overrideTeams(m: KnockoutBracketMatch) {
  const f = form[m.matchId]
  // An empty select means "keep the current team", not "clear it".
  const team1Id = f.team1Id || m.actualTeam1?._id || null
  const team2Id = f.team2Id || m.actualTeam2?._id || null
  run(() => apiFetch(`/api/knockout/matches/${m.matchId}/teams`, {
    method: 'PATCH',
    body: { team1Id, team2Id },
  }), t('adminKnockout.teamsSaved'))
}

function saveResult(m: KnockoutBracketMatch, live: boolean) {
  const f = form[m.matchId]
  const tie = f.score1 === f.score2
  run(() => apiFetch(`/api/knockout/matches/${m.matchId}/result`, {
    method: 'PATCH',
    body: {
      score1: f.score1,
      score2: f.score2,
      live,
      // Penalty winner only matters for a final tie.
      penaltyWinner: tie && !live ? f.penaltyWinner : undefined,
    },
  }), t('adminKnockout.resultSaved'))
}

function clearResult(m: KnockoutBracketMatch) {
  run(() => apiFetch(`/api/knockout/matches/${m.matchId}/clear`, { method: 'PATCH' }), t('adminKnockout.resultCleared'))
}

async function confirmEntry(id: string) {
  await apiFetch(`/api/knockout/entries/${id}/confirm`, { method: 'PATCH' })
  entries.value = await apiFetch<KnockoutEntry[]>('/api/knockout/entries')
}
async function rejectEntry(id: string) {
  await apiFetch(`/api/knockout/entries/${id}/reject`, { method: 'PATCH' })
  entries.value = await apiFetch<KnockoutEntry[]>('/api/knockout/entries')
}

onMounted(loadAll)
</script>
