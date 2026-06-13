#!/usr/bin/env node
/**
 * Standalone sanity check for the live-results integration.
 *
 * It does NOT touch your database. It hits football-data.org with your key,
 * lists the World Cup matches, and shows how each team name maps to the FIFA
 * codes used by your seeder — so you can confirm the mapping works before
 * trusting the automatic updater.
 *
 * Usage (from backend/):
 *   FOOTBALL_DATA_API_KEY=your_key node scripts/test-live-results.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.FOOTBALL_DATA_API_KEY;
const COMP = process.env.FOOTBALL_DATA_COMPETITION || 'WC';

if (!KEY) {
  console.error('Set FOOTBALL_DATA_API_KEY first. Get a free key at');
  console.error('https://www.football-data.org/client/register');
  process.exit(1);
}

// --- mirror of backend/src/live-results/team-alias.ts ---
const normalize = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const ALIASES = {
  'korea republic': 'KOR', 'republic of korea': 'KOR', 'south korea': 'KOR',
  'czech republic': 'CZE', czechia: 'CZE',
  'cote d ivoire': 'CIV', 'cote divoire': 'CIV', 'ivory coast': 'CIV',
  'ir iran': 'IRN', 'islamic republic of iran': 'IRN', iran: 'IRN',
  usa: 'USA', us: 'USA', 'united states': 'USA', 'united states of america': 'USA',
  turkiye: 'TUR', turkey: 'TUR',
  'cabo verde': 'CPV', 'cape verde': 'CPV',
  curacao: 'CUW',
  'dr congo': 'COD', 'congo dr': 'COD',
  'democratic republic of congo': 'COD', 'democratic republic of the congo': 'COD',
  'saudi arabia': 'KSA',
  'bosnia and herzegovina': 'BIH', 'bosnia herzegovina': 'BIH',
};

// Load seeder team codes (source of truth for local FIFA codes / names).
const seed = JSON.parse(
  readFileSync(resolve(__dirname, '../src/seeder/data/worldcup2026.json'), 'utf8'),
);
const nameToCode = new Map();
const knownCodes = new Set();
for (const [name, code] of Object.entries(seed.teamCodes)) {
  nameToCode.set(normalize(name), code);
  knownCodes.add(code);
}

const resolveCode = (team) => {
  for (const cand of [team?.name, team?.shortName].filter(Boolean)) {
    const n = normalize(cand);
    if (ALIASES[n] && knownCodes.has(ALIASES[n])) return ALIASES[n];
    if (nameToCode.has(n)) return nameToCode.get(n);
  }
  if (team?.tla && knownCodes.has(team.tla.toUpperCase())) return team.tla.toUpperCase();
  return null;
};

// --- fetch + report ---
const url = `https://api.football-data.org/v4/competitions/${COMP}/matches`;
const res = await fetch(url, { headers: { 'X-Auth-Token': KEY } });
if (!res.ok) {
  console.error(`API error ${res.status} ${res.statusText}`);
  console.error((await res.text()).slice(0, 300));
  process.exit(1);
}
const { matches = [] } = await res.json();
console.log(`Fetched ${matches.length} matches from competition "${COMP}".\n`);

const unmatched = new Set();
let started = 0;
for (const m of matches) {
  const h = resolveCode(m.homeTeam);
  const a = resolveCode(m.awayTeam);
  if (m.homeTeam?.name && !h) unmatched.add(m.homeTeam.name);
  if (m.awayTeam?.name && !a) unmatched.add(m.awayTeam.name);

  if (['IN_PLAY', 'PAUSED', 'FINISHED'].includes(m.status)) {
    started++;
    const score = `${m.score.fullTime.home ?? '-'}:${m.score.fullTime.away ?? '-'}`;
    console.log(
      `[${m.status.padEnd(8)}] ${(m.homeTeam?.name ?? '?')} (${h ?? '??'}) ` +
        `${score} ${(m.awayTeam?.name ?? '?')} (${a ?? '??'})`,
    );
  }
}

console.log(`\n${started} match(es) started/finished.`);
if (unmatched.size) {
  console.log('\n⚠️  Unmapped team names (add to ALIASES / team-alias.ts):');
  for (const n of unmatched) console.log('   - ' + n);
} else {
  console.log('✅ All team names mapped to a FIFA code.');
}
