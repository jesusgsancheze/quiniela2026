import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Match } from '../matches/schemas/match.schema.js';
import { Team } from '../teams/schemas/team.schema.js';
import { LiveSyncStatusDoc } from './schemas/live-sync-status.schema.js';
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

/** A single fixture as seen by the provider on the last poll. */
export interface ReadFixture {
  home: string;
  away: string;
  score: string;
  status: string;
  matched: boolean;
  changed: boolean;
}

/** Snapshot of the live-results worker, surfaced to admins in the UI. */
export interface LiveSyncStatus {
  /** Last time the cron fired at all (proves the worker is alive). */
  checkedAt: string | null;
  /** Last time we actually called the provider API. */
  polledAt: string | null;
  enabled: boolean;
  /** Whether a fixture was inside its live window on the last check. */
  inWindow: boolean;
  /** Matches written to the DB on the last poll. */
  updated: number;
  unmatchedFixtures: number;
  unmatchedTeams: string[];
  /** What the provider reported for started fixtures on the last poll. */
  fixtures: ReadFixture[];
  /** Error message from the last failed run, if any. */
  error: string | null;
}

@Injectable()
export class LiveResultsService implements OnModuleInit {
  private readonly logger = new Logger(LiveResultsService.name);
  private syncing = false;

  private status: LiveSyncStatus = {
    checkedAt: null,
    polledAt: null,
    enabled: false,
    inWindow: false,
    updated: 0,
    unmatchedFixtures: 0,
    unmatchedTeams: [],
    fixtures: [],
    error: null,
  };

  /** Current worker status for the admin dashboard. */
  getStatus(): LiveSyncStatus {
    return {
      ...this.status,
      enabled: this.enabled,
    };
  }

  constructor(
    private readonly config: ConfigService,
    private readonly provider: FootballDataProvider,
    private readonly matchesService: MatchesService,
    private readonly predictionsService: PredictionsService,
    @InjectModel(Match.name) private readonly matchModel: Model<Match>,
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
    @InjectModel(LiveSyncStatusDoc.name)
    private readonly statusModel: Model<LiveSyncStatusDoc>,
  ) {}

  /** Restore the last persisted snapshot so the dashboard survives restarts. */
  async onModuleInit(): Promise<void> {
    try {
      const doc = await this.statusModel
        .findOne({ key: 'singleton' })
        .lean()
        .exec();
      if (doc) {
        this.status = {
          checkedAt: doc.checkedAt ?? null,
          polledAt: doc.polledAt ?? null,
          enabled: false,
          inWindow: doc.inWindow ?? false,
          updated: doc.updated ?? 0,
          unmatchedFixtures: doc.unmatchedFixtures ?? 0,
          unmatchedTeams: doc.unmatchedTeams ?? [],
          fixtures: (doc.fixtures as unknown as ReadFixture[]) ?? [],
          error: doc.error ?? null,
        };
      }
    } catch (err) {
      this.logger.warn(
        `Could not load persisted live status: ${(err as Error).message}`,
      );
    }
  }

  /** Upsert the in-memory snapshot to MongoDB (best-effort, never throws). */
  private async persistStatus(): Promise<void> {
    try {
      const { enabled: _enabled, ...persistable } = this.status;
      await this.statusModel
        .updateOne(
          { key: 'singleton' },
          { $set: { ...persistable, key: 'singleton' } },
          { upsert: true },
        )
        .exec();
    } catch (err) {
      this.logger.warn(
        `Could not persist live status: ${(err as Error).message}`,
      );
    }
  }

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

    // Record every tick so the dashboard can prove the worker is alive.
    this.status.checkedAt = new Date().toISOString();

    if (!this.enabled) {
      this.status.inWindow = false;
      if (heartbeat) {
        const reason =
          this.config.get<string>('LIVE_RESULTS_ENABLED') === 'true'
            ? 'provider API key missing'
            : 'LIVE_RESULTS_ENABLED is not "true"';
        this.logger.log(`Heartbeat: cron alive, sync disabled (${reason}).`);
      }
      await this.persistStatus();
      return;
    }

    try {
      const summary = await this.sync();
      this.status.error = null;
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
      this.status.error = (err as Error).message;
      this.logger.error(`Live sync failed: ${(err as Error).message}`);
    }
    await this.persistStatus();
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
    // When LIVE_RESULTS_DEBUG=true, log what the provider reports for each
    // started fixture vs. what we have stored — reveals provider data lag.
    const debug = this.config.get<string>('LIVE_RESULTS_DEBUG') === 'true';
    try {
      if (!force && !(await this.hasActiveWindow())) {
        this.status.inWindow = false;
        await this.persistStatus();
        return { polled: false, updated: 0, unmatchedTeams: [], unmatchedFixtures: 0 };
      }
      this.status.inWindow = true;

      const providerMatches = await this.provider.fetchMatches();
      const { nameToCode, knownCodes } = await this.buildTeamMaps();
      const localByPair = await this.buildLocalFixtureIndex();

      let updated = 0;
      let unmatchedFixtures = 0;
      const unmatchedTeams: string[] = [];
      const read: ReadFixture[] = [];

      for (const pm of providerMatches) {
        // Only act on matches that have started.
        if (!['IN_PLAY', 'PAUSED', 'FINISHED'].includes(pm.status)) continue;

        const homeScore = pm.score.fullTime.home ?? 0;
        const awayScore = pm.score.fullTime.away ?? 0;
        const entry: ReadFixture = {
          home: pm.homeTeam.name ?? '??',
          away: pm.awayTeam.name ?? '??',
          score: `${homeScore}-${awayScore}`,
          status: pm.status,
          matched: false,
          changed: false,
        };
        read.push(entry);

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
        entry.matched = true;

        const team1IsHome = local.team1Code === homeCode;
        const score1 = team1IsHome ? homeScore : awayScore;
        const score2 = team1IsHome ? awayScore : homeScore;
        const live = pm.status !== 'FINISHED';

        if (debug) {
          this.logger.log(
            `[debug] ${homeCode} ${homeScore}-${awayScore} ${awayCode} ` +
              `| provider status=${pm.status} | stored ${local.score1 ?? '-'}-${local.score2 ?? '-'} ` +
              `live=${local.live} status=${local.status}`,
          );
        }

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
        entry.changed = true;
        updated++;
      }

      const dedupedTeams = [...new Set(unmatchedTeams)];
      this.status.polledAt = new Date().toISOString();
      this.status.updated = updated;
      this.status.unmatchedFixtures = unmatchedFixtures;
      this.status.unmatchedTeams = dedupedTeams;
      this.status.fixtures = read;
      await this.persistStatus();

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
