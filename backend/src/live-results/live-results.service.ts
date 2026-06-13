import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Match } from '../matches/schemas/match.schema.js';
import { Team } from '../teams/schemas/team.schema.js';
import { MatchesService } from '../matches/matches.service.js';
import { PredictionsService } from '../predictions/predictions.service.js';
import { FootballDataProvider, ProviderMatch } from './football-data.provider.js';
import { normalizeName, resolveTeamCode, pairKey } from './team-alias.js';

/** How long after kickoff we keep polling a fixture (covers ET + penalties). */
const LIVE_WINDOW_MS = 3.5 * 60 * 60 * 1000;
/** How early before kickoff we start polling. */
const PRE_KICKOFF_MS = 10 * 60 * 1000;

export interface SyncSummary {
  polled: boolean;
  updated: number;
  unmatchedTeams: string[];
  unmatchedFixtures: number;
}

@Injectable()
export class LiveResultsService {
  private readonly logger = new Logger(LiveResultsService.name);
  private syncing = false;

  constructor(
    private readonly config: ConfigService,
    private readonly provider: FootballDataProvider,
    private readonly matchesService: MatchesService,
    private readonly predictionsService: PredictionsService,
    @InjectModel(Match.name) private readonly matchModel: Model<Match>,
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
  ) {}

  private get enabled(): boolean {
    return (
      this.config.get<string>('LIVE_RESULTS_ENABLED') === 'true' &&
      !!this.provider.apiKey
    );
  }

  /**
   * Runs every minute, but only calls the external API when at least one local
   * fixture is inside its live window. With ~1 call/min during matches this
   * stays comfortably within the free tier's 10 requests/minute limit.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async scheduledSync(): Promise<void> {
    // Heartbeat: proves the cron is firing every minute and surfaces why a
    // tick is a no-op. Set LIVE_RESULTS_HEARTBEAT=false to silence once happy.
    const heartbeat = this.config.get<string>('LIVE_RESULTS_HEARTBEAT') !== 'false';

    if (!this.enabled) {
      if (heartbeat) {
        const reason =
          this.config.get<string>('LIVE_RESULTS_ENABLED') === 'true'
            ? 'provider API key missing'
            : 'LIVE_RESULTS_ENABLED is not "true"';
        this.logger.log(`Heartbeat: cron alive, sync disabled (${reason}).`);
      }
      return;
    }

    try {
      const summary = await this.sync();
      if (heartbeat) {
        this.logger.log(
          summary.polled
            ? `Heartbeat: polled provider, updated ${summary.updated} match(es), ` +
                `${summary.unmatchedFixtures} unmatched fixture(s).`
            : 'Heartbeat: cron alive, no fixture in live window — skipped API call.',
        );
      }
      if (summary.polled && summary.updated > 0) {
        this.logger.log(`Live sync: updated ${summary.updated} match(es).`);
      }
      if (summary.unmatchedTeams.length > 0) {
        this.logger.warn(
          `Live sync: could not map team(s): ${[...new Set(summary.unmatchedTeams)].join(', ')}`,
        );
      }
    } catch (err) {
      this.logger.error(`Live sync failed: ${(err as Error).message}`);
    }
  }

  /**
   * Core reconciliation. Public so it can be triggered manually / from a test.
   * `force` skips the live-window gate and always hits the API.
   */
  async sync(force = false): Promise<SyncSummary> {
    if (this.syncing) {
      return { polled: false, updated: 0, unmatchedTeams: [], unmatchedFixtures: 0 };
    }
    this.syncing = true;
    try {
      if (!force && !(await this.hasActiveWindow())) {
        return { polled: false, updated: 0, unmatchedTeams: [], unmatchedFixtures: 0 };
      }

      const providerMatches = await this.provider.fetchMatches();
      const { nameToCode, knownCodes } = await this.buildTeamMaps();
      const localByPair = await this.buildLocalFixtureIndex();

      let updated = 0;
      let unmatchedFixtures = 0;
      const unmatchedTeams: string[] = [];

      for (const pm of providerMatches) {
        // Only act on matches that have started.
        if (!['IN_PLAY', 'PAUSED', 'FINISHED'].includes(pm.status)) continue;

        const homeCode = resolveTeamCode(pm.homeTeam, nameToCode, knownCodes);
        const awayCode = resolveTeamCode(pm.awayTeam, nameToCode, knownCodes);
        if (!homeCode) unmatchedTeams.push(pm.homeTeam.name ?? '??');
        if (!awayCode) unmatchedTeams.push(pm.awayTeam.name ?? '??');
        if (!homeCode || !awayCode) continue;

        const local = localByPair.get(pairKey(homeCode, awayCode));
        if (!local) {
          unmatchedFixtures++;
          continue;
        }

        const homeScore = pm.score.fullTime.home ?? 0;
        const awayScore = pm.score.fullTime.away ?? 0;
        const team1IsHome = local.team1Code === homeCode;
        const score1 = team1IsHome ? homeScore : awayScore;
        const score2 = team1IsHome ? awayScore : homeScore;
        const live = pm.status !== 'FINISHED';

        // Skip if nothing changed, to avoid redundant point recalculations.
        if (
          local.score1 === score1 &&
          local.score2 === score2 &&
          local.live === live &&
          local.status === 'finished'
        ) {
          continue;
        }

        await this.matchesService.setResult(local.id, score1, score2, live);
        await this.predictionsService.calculatePoints(local.id, score1, score2);
        updated++;
      }

      return { polled: true, updated, unmatchedTeams, unmatchedFixtures };
    } finally {
      this.syncing = false;
    }
  }

  /** True if any local fixture is currently inside its polling window. */
  private async hasActiveWindow(): Promise<boolean> {
    const now = Date.now();
    const from = new Date(now - LIVE_WINDOW_MS);
    const to = new Date(now + PRE_KICKOFF_MS);
    const count = await this.matchModel
      .countDocuments({
        date: { $gte: from, $lte: to },
        $or: [{ status: { $ne: 'finished' } }, { live: true }],
      })
      .exec();
    return count > 0;
  }

  private async buildTeamMaps(): Promise<{
    nameToCode: Map<string, string>;
    knownCodes: Set<string>;
  }> {
    const teams = await this.teamModel.find({}, { name: 1, code: 1 }).exec();
    const nameToCode = new Map<string, string>();
    const knownCodes = new Set<string>();
    for (const t of teams) {
      nameToCode.set(normalizeName(t.name), t.code);
      knownCodes.add(t.code);
    }
    return { nameToCode, knownCodes };
  }

  /** Index of startable fixtures keyed by unordered team-code pair. */
  private async buildLocalFixtureIndex(): Promise<
    Map<
      string,
      {
        id: string;
        team1Code: string;
        score1: number | null;
        score2: number | null;
        live: boolean;
        status: string;
        date: Date;
      }
    >
  > {
    const matches = await this.matchModel
      .find({ team1: { $ne: null }, team2: { $ne: null } })
      .populate('team1')
      .populate('team2')
      .exec();

    const index = new Map<string, {
      id: string;
      team1Code: string;
      score1: number | null;
      score2: number | null;
      live: boolean;
      status: string;
      date: Date;
    }>();

    for (const m of matches) {
      const t1 = m.team1 as unknown as Team | null;
      const t2 = m.team2 as unknown as Team | null;
      if (!t1?.code || !t2?.code) continue;
      const key = pairKey(t1.code, t2.code);
      const entry = {
        id: m._id.toString(),
        team1Code: t1.code,
        score1: m.score1,
        score2: m.score2,
        live: m.live,
        status: m.status,
        date: m.date,
      };
      // If two fixtures share a pair (shouldn't happen at WC), keep the nearest
      // to "now" so live data lands on the match actually being played.
      const existing = index.get(key);
      if (
        !existing ||
        Math.abs(entry.date.getTime() - Date.now()) <
          Math.abs(existing.date.getTime() - Date.now())
      ) {
        index.set(key, entry);
      }
    }
    return index;
  }
}
