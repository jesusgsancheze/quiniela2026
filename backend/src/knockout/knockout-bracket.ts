/**
 * Pure helpers describing the 2026 knockout bracket structure and the logic for
 * placing the eight best third-placed teams into the Round of 32.
 *
 * The bracket itself is read from the seeded Match documents (their
 * placeholder1/placeholder2 strings), so this file only needs to know how to
 * *interpret* those placeholders — not hard-code the tree.
 */

export const KNOCKOUT_STAGES = [
  'round32',
  'round16',
  'quarter',
  'semi',
  'third',
  'final',
] as const;

export type KnockoutStage = (typeof KNOCKOUT_STAGES)[number];

export type FeederKind = 'groupWinner' | 'groupRunnerUp' | 'groupThird' | 'matchWinner' | 'matchLoser';

export interface Feeder {
  kind: FeederKind;
  /** Group letter (for group feeders) e.g. "A". */
  group?: string;
  /** Candidate group letters for a best-third slot, e.g. ["A","B","C","D","F"]. */
  thirdCandidates?: string[];
  /** Feeder match number (for matchWinner / matchLoser). */
  matchNumber?: number;
}

/**
 * Interprets a placeholder string from a Match document:
 *   "1A"        -> winner of group A
 *   "2B"        -> runner-up of group B
 *   "3ABCDF"    -> a best third-placed team from one of groups A,B,C,D,F
 *   "W74"       -> winner of match 74
 *   "L101"      -> loser of match 101
 */
export function parseFeeder(placeholder: string | null | undefined): Feeder | null {
  if (!placeholder) return null;
  const p = placeholder.trim().toUpperCase();

  if (/^1[A-L]$/.test(p)) return { kind: 'groupWinner', group: p[1] };
  if (/^2[A-L]$/.test(p)) return { kind: 'groupRunnerUp', group: p[1] };
  if (/^3[A-L]{2,}$/.test(p)) {
    return { kind: 'groupThird', thirdCandidates: p.slice(1).split('') };
  }
  if (/^W\d+$/.test(p)) return { kind: 'matchWinner', matchNumber: Number(p.slice(1)) };
  if (/^L\d+$/.test(p)) return { kind: 'matchLoser', matchNumber: Number(p.slice(1)) };
  return null;
}

export interface ThirdPlaceTeam {
  group: string; // "A".."L"
  teamId: string;
  points: number;
  goalDifference: number;
  goalsFor: number;
}

/**
 * Ranks all third-placed teams (points -> GD -> GF) and returns the best 8.
 */
export function rankBestThirds(thirds: ThirdPlaceTeam[]): ThirdPlaceTeam[] {
  return [...thirds]
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference)
        return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    })
    .slice(0, 8);
}

/**
 * Assigns the qualifying third-placed groups to the Round-of-32 third slots.
 *
 * `slotCandidates` maps each slot's match number to its allowed group letters
 * (parsed from the "3ABCDF" placeholders). Returns a map of matchNumber ->
 * group letter, or null if no valid assignment exists.
 *
 * This reproduces FIFA's Annexe C intent via constraint satisfaction: each of
 * the eight qualifying groups fills exactly one slot, respecting that slot's
 * candidate set. Where FIFA's official table would differ in an ambiguous case,
 * the admin can override the resulting matchups.
 */
export function assignThirdsToSlots(
  qualifiedGroups: string[],
  slotCandidates: Record<number, string[]>,
): Record<number, string> | null {
  const slots = Object.keys(slotCandidates).map(Number).sort((a, b) => a - b);
  const groups = [...qualifiedGroups];
  const result: Record<number, string> = {};
  const usedGroups = new Set<string>();

  // Order slots by how constrained they are (fewest viable candidates first)
  // to make backtracking efficient and deterministic.
  const viable = (slot: number) =>
    slotCandidates[slot].filter((g) => groups.includes(g));
  const ordered = [...slots].sort((a, b) => viable(a).length - viable(b).length);

  const backtrack = (i: number): boolean => {
    if (i === ordered.length) return usedGroups.size === groups.length;
    const slot = ordered[i];
    for (const g of slotCandidates[slot]) {
      if (usedGroups.has(g)) continue;
      if (!groups.includes(g)) continue;
      result[slot] = g;
      usedGroups.add(g);
      if (backtrack(i + 1)) return true;
      usedGroups.delete(g);
      delete result[slot];
    }
    return false;
  };

  return backtrack(0) ? result : null;
}
