/**
 * Helpers to reconcile team naming differences between the external
 * results provider (football-data.org) and the local seeded teams.
 *
 * The local DB identifies teams by FIFA code (e.g. KOR, USA, CIV). The
 * external provider sometimes uses different display names ("Korea Republic"
 * instead of "South Korea", "Czech Republic" instead of "Czechia", etc.), so
 * we normalize names and keep an explicit alias table for the tricky ones.
 */

/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Normalized provider/common name -> local FIFA code.
 * Only entries that differ from the local team `name` need to live here;
 * the resolver also matches by the local team name directly.
 */
export const TEAM_ALIASES: Record<string, string> = {
  // South Korea
  'korea republic': 'KOR',
  'republic of korea': 'KOR',
  'south korea': 'KOR',
  // Czechia
  'czech republic': 'CZE',
  czechia: 'CZE',
  // Ivory Coast
  'cote d ivoire': 'CIV',
  'cote divoire': 'CIV',
  'ivory coast': 'CIV',
  // Iran
  'ir iran': 'IRN',
  'islamic republic of iran': 'IRN',
  iran: 'IRN',
  // United States
  usa: 'USA',
  us: 'USA',
  'united states': 'USA',
  'united states of america': 'USA',
  // Türkiye
  turkiye: 'TUR',
  turkey: 'TUR',
  // Cape Verde
  'cabo verde': 'CPV',
  'cape verde': 'CPV',
  // Curaçao
  curacao: 'CUW',
  // DR Congo
  'dr congo': 'COD',
  'congo dr': 'COD',
  'democratic republic of congo': 'COD',
  'democratic republic of the congo': 'COD',
  // Saudi Arabia (FIFA code KSA)
  'saudi arabia': 'KSA',
  // Bosnia and Herzegovina
  'bosnia and herzegovina': 'BIH',
  'bosnia herzegovina': 'BIH',
};

/**
 * Resolve an external team (name + optional 3-letter abbreviation) to a local
 * FIFA code. `nameToCode` is the runtime map built from the seeded teams.
 * Returns null if it cannot be resolved (caller should log it).
 */
export function resolveTeamCode(
  external: { name?: string | null; tla?: string | null; shortName?: string | null },
  nameToCode: Map<string, string>,
  knownCodes: Set<string>,
): string | null {
  const candidates = [external.name, external.shortName].filter(
    (v): v is string => !!v,
  );

  for (const candidate of candidates) {
    const norm = normalizeName(candidate);
    if (TEAM_ALIASES[norm] && knownCodes.has(TEAM_ALIASES[norm])) {
      return TEAM_ALIASES[norm];
    }
    if (nameToCode.has(norm)) {
      return nameToCode.get(norm)!;
    }
  }

  // Fall back to the provider's 3-letter code if it happens to be a FIFA code.
  if (external.tla && knownCodes.has(external.tla.toUpperCase())) {
    return external.tla.toUpperCase();
  }

  return null;
}

/** Unordered key for a pair of team codes, used to match fixtures. */
export function pairKey(codeA: string, codeB: string): string {
  return [codeA, codeB].sort().join('|');
}
