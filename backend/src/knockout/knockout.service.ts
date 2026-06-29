import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { KnockoutEntry } from './schemas/knockout-entry.schema.js';
import { KnockoutPrediction } from './schemas/knockout-prediction.schema.js';
import { Match } from '../matches/schemas/match.schema.js';
import { Team } from '../teams/schemas/team.schema.js';
import { User } from '../users/schemas/user.schema.js';
import { parseFeeder } from './knockout-bracket.js';
import { actualAdvancingSlot } from './knockout-bracket.service.js';

const KNOCKOUT_STAGES = ['round32', 'round16', 'quarter', 'semi', 'third', 'final'];

export interface TeamLite {
  _id: string;
  name: string;
  code: string;
  flagUrl: string | null;
}

@Injectable()
export class KnockoutService {
  private readonly deadline: Date;
  private readonly championBonus: number;

  constructor(
    @InjectModel(KnockoutEntry.name) private entryModel: Model<KnockoutEntry>,
    @InjectModel(KnockoutPrediction.name)
    private predictionModel: Model<KnockoutPrediction>,
    @InjectModel(Match.name) private matchModel: Model<Match>,
    @InjectModel(Team.name) private teamModel: Model<Team>,
    @InjectModel(User.name) private userModel: Model<User>,
    private config: ConfigService,
  ) {
    this.deadline = new Date(
      this.config.get<string>('PREDICTIONS_DEADLINE', '2026-06-11T00:00:00Z'),
    );
    this.championBonus = Number(
      this.config.get<string>('KNOCKOUT_CHAMPION_BONUS', '2'),
    );
  }

  // ---------------------------------------------------------------------------
  // Entries
  // ---------------------------------------------------------------------------

  async findEntriesByUser(userId: string): Promise<KnockoutEntry[]> {
    return this.entryModel
      .find({ user: new Types.ObjectId(userId) })
      .sort({ entryNumber: -1 })
      .exec();
  }

  async findActiveEntry(userId: string): Promise<KnockoutEntry | null> {
    return this.entryModel
      .findOne({ user: new Types.ObjectId(userId), status: 'active' })
      .sort({ entryNumber: -1 })
      .exec();
  }

  async findLatestConfirmedEntry(userId: string): Promise<KnockoutEntry | null> {
    return this.entryModel
      .findOne({ user: new Types.ObjectId(userId), paymentStatus: 'confirmed' })
      .sort({ entryNumber: -1 })
      .exec();
  }

  async findLatestEntry(userId: string): Promise<KnockoutEntry | null> {
    return this.entryModel
      .findOne({ user: new Types.ObjectId(userId) })
      .sort({ entryNumber: -1 })
      .exec();
  }

  async findEntryForUser(entryId: string, userId: string): Promise<KnockoutEntry | null> {
    if (!Types.ObjectId.isValid(entryId)) return null;
    return this.entryModel
      .findOne({ _id: new Types.ObjectId(entryId), user: new Types.ObjectId(userId) })
      .exec();
  }

  async createNewEntry(userId: string): Promise<KnockoutEntry> {
    const latest = await this.findLatestEntry(userId);
    if (latest && latest.status !== 'completed') {
      throw new BadRequestException(
        'You already have an active knockout entry. Complete it before requesting a new one.',
      );
    }
    const nextNumber = latest ? latest.entryNumber + 1 : 1;
    return this.entryModel.create({
      user: new Types.ObjectId(userId),
      entryNumber: nextNumber,
      paymentStatus: 'pending',
      paymentNote: null,
      status: 'active',
      completedAt: null,
    });
  }

  async reportPayment(userId: string, note?: string): Promise<KnockoutEntry> {
    const entry = await this.findActiveEntry(userId);
    if (!entry) throw new NotFoundException('No active knockout entry to report payment for');
    if (entry.paymentStatus === 'confirmed') {
      throw new BadRequestException('Payment for this entry is already confirmed');
    }
    entry.paymentStatus = 'reported';
    entry.paymentNote = note ?? null;
    await entry.save();
    return entry;
  }

  async confirmPayment(entryId: string): Promise<KnockoutEntry> {
    const entry = await this.entryModel.findById(entryId).exec();
    if (!entry) throw new NotFoundException('Knockout entry not found');
    entry.paymentStatus = 'confirmed';
    await entry.save();
    return entry;
  }

  async rejectPayment(entryId: string): Promise<KnockoutEntry> {
    const entry = await this.entryModel.findById(entryId).exec();
    if (!entry) throw new NotFoundException('Knockout entry not found');
    entry.paymentStatus = 'pending';
    entry.paymentNote = null;
    await entry.save();
    return entry;
  }

  async listAllEntries(): Promise<KnockoutEntry[]> {
    return this.entryModel.find().sort({ user: 1, entryNumber: 1 }).exec();
  }

  /** All entries with how many of the knockout matches each one has filled. */
  async listAllEntriesWithProgress() {
    const entries = await this.entryModel
      .find()
      .sort({ user: 1, entryNumber: 1 })
      .lean()
      .exec();
    const total = await this.matchModel.countDocuments({
      stage: { $in: KNOCKOUT_STAGES },
    });
    const counts = await this.predictionModel.aggregate([
      { $group: { _id: '$entry', count: { $sum: 1 } } },
    ]);
    const countByEntry = new Map<string, number>(
      counts.map((c) => [c._id?.toString(), c.count]),
    );
    const champions = await this.computeChampions();

    return entries.map((e: any) => {
      const filled = countByEntry.get(e._id.toString()) || 0;
      const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;
      return {
        _id: e._id.toString(),
        user: e.user.toString(),
        entryNumber: e.entryNumber,
        paymentStatus: e.paymentStatus,
        paymentNote: e.paymentNote ?? null,
        status: e.status,
        completedAt: e.completedAt ?? null,
        progress: { filled, total, percentage },
        champion: champions.get(e._id.toString()) ?? null,
      };
    });
  }

  private ensureCanPredict(entry: KnockoutEntry | null): KnockoutEntry {
    if (!entry) {
      throw new ForbiddenException('You do not have a knockout entry yet.');
    }
    if (entry.paymentStatus !== 'confirmed') {
      throw new ForbiddenException('Knockout entry payment is not confirmed yet.');
    }
    return entry;
  }

  // ---------------------------------------------------------------------------
  // Predictions
  // ---------------------------------------------------------------------------

  private isLocked(): boolean {
    return new Date() >= this.deadline;
  }

  async upsertPrediction(
    userId: string,
    matchId: string,
    score1: number,
    score2: number,
    advances: 'team1' | 'team2',
    entryId?: string,
  ): Promise<KnockoutPrediction> {
    if (this.isLocked()) {
      throw new ForbiddenException('Knockout predictions are locked.');
    }
    const match = await this.matchModel.findById(matchId).exec();
    if (!match || !KNOCKOUT_STAGES.includes(match.stage)) {
      throw new BadRequestException('Not a knockout match');
    }
    if (match.status === 'finished' || new Date() >= new Date(match.date)) {
      throw new ForbiddenException('This match has already started.');
    }

    const targetEntry = entryId
      ? await this.findEntryForUser(entryId, userId)
      : await this.findLatestConfirmedEntry(userId);
    const entry = this.ensureCanPredict(targetEntry);

    const prediction = (await this.predictionModel
      .findOneAndUpdate(
        { entry: entry._id, match: matchId },
        {
          user: userId,
          entry: entry._id,
          match: matchId,
          score1,
          score2,
          advances,
          points: null,
        },
        { upsert: true, new: true },
      )
      .exec()) as KnockoutPrediction;

    await this.maybeMarkCompleted(entry);
    return prediction;
  }

  private async maybeMarkCompleted(entry: KnockoutEntry): Promise<void> {
    if (entry.status === 'completed') return;
    const total = await this.matchModel.countDocuments({
      stage: { $in: KNOCKOUT_STAGES },
    });
    if (total === 0) return;
    const filled = await this.predictionModel.countDocuments({ entry: entry._id });
    if (filled >= total) {
      entry.status = 'completed';
      entry.completedAt = new Date();
      await entry.save();
    }
  }

  async getPredictionsForEntry(entryId: Types.ObjectId): Promise<KnockoutPrediction[]> {
    return this.predictionModel.find({ entry: entryId }).exec();
  }

  // ---------------------------------------------------------------------------
  // Bracket assembly (knockout matches + a player's derived teams & picks)
  // ---------------------------------------------------------------------------

  private async loadTeamMap(): Promise<Map<string, TeamLite>> {
    const teams = await this.teamModel.find().lean().exec();
    const map = new Map<string, TeamLite>();
    for (const t of teams as any[]) {
      map.set(t._id.toString(), {
        _id: t._id.toString(),
        name: t.name,
        code: t.code,
        flagUrl: t.flagUrl ?? null,
      });
    }
    return map;
  }

  /**
   * Computes the two team ids (and the advancing team id) for every knockout
   * position *within a single player's bracket*, propagating their own picks
   * forward from the Round of 32. `picks` maps matchNumber -> advances side.
   */
  private computeBracketTeams(
    matchesByNumber: Map<number, Match>,
    picks: Map<number, 'team1' | 'team2'>,
  ): Map<number, { team1: string | null; team2: string | null; advancing: string | null }> {
    const out = new Map<number, { team1: string | null; team2: string | null; advancing: string | null }>();
    const numbers = [...matchesByNumber.keys()].sort((a, b) => a - b);

    const sideTeam = (m: Match, slot: 'team1' | 'team2'): string | null => {
      const ph = slot === 'team1' ? m.team1Placeholder : m.team2Placeholder;
      const feeder = parseFeeder(ph);
      if (feeder && (feeder.kind === 'matchWinner' || feeder.kind === 'matchLoser')) {
        const src = out.get(feeder.matchNumber!);
        if (!src) return null;
        if (feeder.kind === 'matchWinner') return src.advancing;
        // loser = the non-advancing side
        if (!src.advancing) return null;
        return src.advancing === src.team1 ? src.team2 : src.team1;
      }
      // Group feeder (R32) — use the actual resolved team on the match.
      const resolved = m[slot] as Types.ObjectId | null;
      return resolved ? resolved.toString() : null;
    };

    for (const num of numbers) {
      const m = matchesByNumber.get(num)!;
      const team1 = sideTeam(m, 'team1');
      const team2 = sideTeam(m, 'team2');
      const pick = picks.get(num);
      const advancing = pick ? (pick === 'team1' ? team1 : team2) : null;
      out.set(num, { team1, team2, advancing });
    }
    return out;
  }

  /**
   * Full bracket payload for a player: every knockout match with its actual
   * resolved teams + result, plus the player's derived bracket teams and pick.
   */
  async getBracket(userId: string, entryId?: string) {
    const matches = await this.matchModel
      .find({ stage: { $in: KNOCKOUT_STAGES } })
      .sort({ matchNumber: 1 })
      .exec();
    const matchesByNumber = new Map<number, Match>();
    for (const m of matches) matchesByNumber.set(m.matchNumber, m);

    const teamMap = await this.loadTeamMap();

    const targetEntry = entryId
      ? await this.findEntryForUser(entryId, userId)
      : (await this.findLatestConfirmedEntry(userId)) ||
        (await this.findLatestEntry(userId));

    const predByMatch = new Map<string, KnockoutPrediction>();
    const picks = new Map<number, 'team1' | 'team2'>();
    if (targetEntry) {
      const preds = await this.getPredictionsForEntry(targetEntry._id as Types.ObjectId);
      for (const p of preds) {
        predByMatch.set(p.match.toString(), p);
        const mm = matches.find((m) => m._id.toString() === p.match.toString());
        if (mm) picks.set(mm.matchNumber, p.advances);
      }
    }

    const userTeams = this.computeBracketTeams(matchesByNumber, picks);
    const team = (id: string | null) => (id ? teamMap.get(id) ?? null : null);

    const rows = matches.map((m) => {
      const ut = userTeams.get(m.matchNumber)!;
      const pred = predByMatch.get(m._id.toString());
      return {
        matchId: m._id.toString(),
        matchNumber: m.matchNumber,
        stage: m.stage,
        round: m.round,
        date: m.date,
        venue: m.venue,
        placeholder1: m.team1Placeholder,
        placeholder2: m.team2Placeholder,
        // Actual tournament teams + result
        actualTeam1: team(m.team1 ? m.team1.toString() : null),
        actualTeam2: team(m.team2 ? m.team2.toString() : null),
        status: m.status,
        live: m.live,
        score1: m.score1,
        score2: m.score2,
        decidedOnPenalties: m.decidedOnPenalties,
        penaltyWinner: m.penaltyWinner,
        // This player's bracket
        myTeam1: team(ut.team1),
        myTeam2: team(ut.team2),
        prediction: pred
          ? { score1: pred.score1, score2: pred.score2, advances: pred.advances, points: pred.points }
          : null,
      };
    });

    return {
      entryId: targetEntry ? targetEntry._id.toString() : null,
      paymentStatus: targetEntry?.paymentStatus ?? null,
      locked: this.isLocked(),
      deadline: this.deadline.toISOString(),
      matches: rows,
    };
  }

  // ---------------------------------------------------------------------------
  // Public views (matches list, per-match picks, per-entry picks, draw)
  // ---------------------------------------------------------------------------

  /** Every knockout match with its actual info + community advance split. */
  async getPublicMatches() {
    const matches = await this.matchModel
      .find({ stage: { $in: KNOCKOUT_STAGES } })
      .sort({ matchNumber: 1 })
      .exec();
    const teamMap = await this.loadTeamMap();
    const team = (id: Types.ObjectId | null) =>
      id ? teamMap.get(id.toString()) ?? null : null;

    const preds = await this.predictionModel
      .find({}, { match: 1, advances: 1, user: 1, entry: 1 })
      .populate('user', 'role')
      .populate('entry', '_id')
      .lean()
      .exec();
    const agg = new Map<string, { team1: number; team2: number; total: number }>();
    for (const p of preds as any[]) {
      if (!p.user || p.user.role === 'admin' || !p.entry) continue;
      const key = p.match.toString();
      if (!agg.has(key)) agg.set(key, { team1: 0, team2: 0, total: 0 });
      const a = agg.get(key)!;
      if (p.advances === 'team1') a.team1++;
      else a.team2++;
      a.total++;
    }

    return matches.map((m) => ({
      matchId: m._id.toString(),
      matchNumber: m.matchNumber,
      stage: m.stage,
      round: m.round,
      date: m.date,
      venue: m.venue,
      placeholder1: m.team1Placeholder,
      placeholder2: m.team2Placeholder,
      team1: team(m.team1),
      team2: team(m.team2),
      status: m.status,
      live: m.live,
      score1: m.score1,
      score2: m.score2,
      decidedOnPenalties: m.decidedOnPenalties,
      penaltyWinner: m.penaltyWinner,
      community: agg.get(m._id.toString()) ?? { team1: 0, team2: 0, total: 0 },
    }));
  }

  /** All players' picks for one knockout match, with the match's full info. */
  async getMatchPredictions(matchId: string) {
    if (!Types.ObjectId.isValid(matchId)) return { match: null, predictions: [] };
    const m = await this.matchModel.findById(matchId).exec();
    if (!m || !KNOCKOUT_STAGES.includes(m.stage)) {
      return { match: null, predictions: [] };
    }
    const teamMap = await this.loadTeamMap();
    const team = (id: Types.ObjectId | null) =>
      id ? teamMap.get(id.toString()) ?? null : null;
    const t1 = team(m.team1);
    const t2 = team(m.team2);

    const preds = await this.predictionModel
      .find({ match: matchId })
      .populate('user', 'firstName lastName profilePicture role')
      .populate('entry', 'entryNumber')
      .exec();

    const predictions = preds
      .filter((p: any) => p.user && p.user.role !== 'admin' && p.entry)
      .map((p: any) => ({
        _id: p._id.toString(),
        score1: p.score1,
        score2: p.score2,
        advances: p.advances,
        advancesTeam: p.advances === 'team1' ? t1 : t2,
        points: p.points,
        result: p.result,
        entryNumber: p.entry?.entryNumber ?? null,
        user: {
          firstName: p.user.firstName,
          lastName: p.user.lastName,
          profilePicture: p.user.profilePicture ?? null,
        },
      }));

    return {
      match: {
        matchId: m._id.toString(),
        matchNumber: m.matchNumber,
        stage: m.stage,
        round: m.round,
        date: m.date,
        venue: m.venue,
        placeholder1: m.team1Placeholder,
        placeholder2: m.team2Placeholder,
        team1: t1,
        team2: t2,
        status: m.status,
        live: m.live,
        score1: m.score1,
        score2: m.score2,
        decidedOnPenalties: m.decidedOnPenalties,
        penaltyWinner: m.penaltyWinner,
      },
      predictions,
    };
  }

  /** One entry's picks across every knockout match (for the leaderboard expand). */
  async getEntryPredictionsDetail(entryId: string) {
    if (!Types.ObjectId.isValid(entryId)) return { predictions: [] };
    const preds = await this.predictionModel
      .find({ entry: new Types.ObjectId(entryId) })
      .exec();
    const matches = await this.matchModel
      .find({ stage: { $in: KNOCKOUT_STAGES } })
      .exec();
    const byId = new Map(matches.map((m) => [m._id.toString(), m]));
    const teamMap = await this.loadTeamMap();
    const team = (id: Types.ObjectId | null) =>
      id ? teamMap.get(id.toString()) ?? null : null;

    const predictions = preds
      .map((p) => {
        const m = byId.get(p.match.toString());
        return {
          matchNumber: m?.matchNumber ?? 0,
          stage: m?.stage ?? '',
          round: m?.round ?? '',
          team1: m ? team(m.team1) : null,
          team2: m ? team(m.team2) : null,
          placeholder1: m?.team1Placeholder ?? null,
          placeholder2: m?.team2Placeholder ?? null,
          actualScore1: m?.score1 ?? null,
          actualScore2: m?.score2 ?? null,
          status: m?.status ?? null,
          score1: p.score1,
          score2: p.score2,
          advances: p.advances,
          advancesTeam:
            p.advances === 'team1'
              ? m ? team(m.team1) : null
              : m ? team(m.team2) : null,
          points: p.points,
          result: p.result,
        };
      })
      .sort((a, b) => a.matchNumber - b.matchNumber);

    return { predictions };
  }

  // ---------------------------------------------------------------------------
  // Scoring
  // ---------------------------------------------------------------------------

  /**
   * Recompute points for every knockout prediction. Position-based: 3 for the
   * exact score, else 1 for the correct advancing team; +championBonus on the
   * final for the correct champion.
   */
  async recalcAllPoints(): Promise<{ scored: number }> {
    const matches = await this.matchModel
      .find({ stage: { $in: KNOCKOUT_STAGES } })
      .sort({ matchNumber: 1 })
      .exec();
    const matchesByNumber = new Map<number, Match>();
    const matchById = new Map<string, Match>();
    for (const m of matches) {
      matchesByNumber.set(m.matchNumber, m);
      matchById.set(m._id.toString(), m);
    }

    // Actual advancing team id + finished result per match.
    const actualAdvancing = new Map<string, string | null>();
    for (const m of matches) {
      const slot = actualAdvancingSlot(m);
      const id = slot ? ((m[slot] as Types.ObjectId | null)?.toString() ?? null) : null;
      actualAdvancing.set(m._id.toString(), id);
    }
    const finalMatch = matches.find((m) => m.stage === 'final');
    const actualChampion = finalMatch ? actualAdvancing.get(finalMatch._id.toString()) ?? null : null;

    const entries = await this.entryModel.find().exec();
    let scored = 0;

    for (const entry of entries) {
      const preds = await this.getPredictionsForEntry(entry._id as Types.ObjectId);
      const picks = new Map<number, 'team1' | 'team2'>();
      for (const p of preds) {
        const mm = matchById.get(p.match.toString());
        if (mm) picks.set(mm.matchNumber, p.advances);
      }
      const userTeams = this.computeBracketTeams(matchesByNumber, picks);

      for (const p of preds) {
        const m = matchById.get(p.match.toString());
        if (!m) continue;
        if (m.status !== 'finished' || m.score1 == null || m.score2 == null) {
          p.points = null;
          p.result = null;
          await p.save();
          continue;
        }
        const actualAdvId = actualAdvancing.get(m._id.toString());
        const myAdvId = userTeams.get(m.matchNumber)?.advancing ?? null;

        let points = 0;
        let result: 'exact' | 'correct' | 'miss' = 'miss';
        if (p.score1 === m.score1 && p.score2 === m.score2) {
          points = 3;
          result = 'exact';
        } else if (myAdvId && actualAdvId && myAdvId === actualAdvId) {
          points = 1;
          result = 'correct';
        }
        if (m.stage === 'final' && actualChampion && myAdvId === actualChampion) {
          points += this.championBonus;
        }
        p.points = points;
        p.result = result;
        await p.save();
        scored++;
      }
    }
    return { scored };
  }

  // ---------------------------------------------------------------------------
  // Leaderboard
  // ---------------------------------------------------------------------------

  /** Each entry's predicted champion (the team they advance in the final). */
  private async computeChampions(): Promise<Map<string, TeamLite | null>> {
    const matches = await this.matchModel
      .find({ stage: { $in: KNOCKOUT_STAGES } })
      .sort({ matchNumber: 1 })
      .exec();
    const finalMatch = matches.find((m) => m.stage === 'final');
    const matchesByNumber = new Map<number, Match>();
    const matchById = new Map<string, Match>();
    for (const m of matches) {
      matchesByNumber.set(m.matchNumber, m);
      matchById.set(m._id.toString(), m);
    }

    const out = new Map<string, TeamLite | null>();
    if (!finalMatch) return out;

    const preds = await this.predictionModel
      .find({}, { entry: 1, match: 1, advances: 1 })
      .lean()
      .exec();
    const picksByEntry = new Map<string, Map<number, 'team1' | 'team2'>>();
    for (const p of preds as any[]) {
      const eid = p.entry.toString();
      const m = matchById.get(p.match.toString());
      if (!m) continue;
      if (!picksByEntry.has(eid)) picksByEntry.set(eid, new Map());
      picksByEntry.get(eid)!.set(m.matchNumber, p.advances);
    }

    const teamMap = await this.loadTeamMap();
    for (const [eid, picks] of picksByEntry) {
      const teams = this.computeBracketTeams(matchesByNumber, picks);
      const champId = teams.get(finalMatch.matchNumber)?.advancing ?? null;
      out.set(eid, champId ? teamMap.get(champId) ?? null : null);
    }
    return out;
  }

  async getRankings() {
    const grouped = await this.predictionModel.aggregate([
      {
        $group: {
          _id: { user: '$user', entry: '$entry' },
          totalPoints: { $sum: '$points' },
          matchesScored: { $sum: { $cond: [{ $gt: ['$points', null] }, 1, 0] } },
          exactCount: { $sum: { $cond: [{ $eq: ['$result', 'exact'] }, 1, 0] } },
          correctCount: { $sum: { $cond: [{ $eq: ['$result', 'correct'] }, 1, 0] } },
        },
      },
    ]);
    if (grouped.length === 0) return [];

    const userIds = Array.from(new Set(grouped.map((g) => g._id.user.toString())));
    const entryIds = Array.from(new Set(grouped.map((g) => g._id.entry.toString())));
    const [users, entries] = await Promise.all([
      this.userModel.find({ _id: { $in: userIds } }, { password: 0 }).exec(),
      this.entryModel.find({ _id: { $in: entryIds } }).exec(),
    ]);
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const entryMap = new Map(entries.map((e) => [e._id.toString(), e]));
    const champions = await this.computeChampions();

    const results = grouped
      .map((g) => {
        const user = userMap.get(g._id.user.toString());
        const entry = entryMap.get(g._id.entry.toString());
        if (!user || !entry || user.role === 'admin') return null;
        return {
          userId: user._id.toString(),
          entryId: entry._id.toString(),
          entryNumber: entry.entryNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profilePicture: user.profilePicture,
          totalPoints: g.totalPoints || 0,
          matchesScored: g.matchesScored || 0,
          exactCount: g.exactCount || 0,
          correctCount: g.correctCount || 0,
          champion: champions.get(entry._id.toString()) ?? null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.totalPoints - a!.totalPoints);

    // Standard competition ranking — tied players share a rank.
    let lastPoints: number | null = null;
    let lastRank = 0;
    return results.map((r, i) => {
      const rank = r!.totalPoints === lastPoints ? lastRank : i + 1;
      lastPoints = r!.totalPoints;
      lastRank = rank;
      return { ...r, rank };
    });
  }
}
