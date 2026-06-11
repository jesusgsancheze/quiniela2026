import {
  Injectable,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { Prediction } from './schemas/prediction.schema.js';
import { MatchesService } from '../matches/matches.service.js';
import { EntriesService } from '../entries/entries.service.js';

@Injectable()
export class PredictionsService {
  private readonly deadline: Date;

  constructor(
    @InjectModel(Prediction.name) private predictionModel: Model<Prediction>,
    @Inject(forwardRef(() => MatchesService))
    private matchesService: MatchesService,
    @Inject(forwardRef(() => EntriesService))
    private entriesService: EntriesService,
    private configService: ConfigService,
  ) {
    this.deadline = new Date(
      this.configService.get<string>(
        'PREDICTIONS_DEADLINE',
        '2026-06-11T00:00:00Z',
      ),
    );
  }

  async upsert(
    userId: string,
    matchId: string,
    score1: number,
    score2: number,
    entryId?: string,
  ): Promise<Prediction> {
    if (new Date() >= this.deadline) {
      throw new ForbiddenException(
        'Predictions are locked. The tournament has started.',
      );
    }

    const targetEntry = entryId
      ? await this.entriesService.findEntryForUser(entryId, userId)
      : await this.entriesService.findLatestConfirmedEntry(userId);
    const entry = this.entriesService.ensureCanPredict(targetEntry);

    const prediction = (await this.predictionModel
      .findOneAndUpdate(
        { entry: entry._id, match: matchId },
        {
          user: userId,
          entry: entry._id,
          match: matchId,
          score1,
          score2,
          points: null,
        },
        { upsert: true, new: true },
      )
      .exec()) as Prediction;

    await this.entriesService.maybeMarkCompleted(entry);

    return prediction;
  }

  async findByUser(
    userId: string,
    _filled?: string,
    entryId?: string,
  ): Promise<Prediction[]> {
    const targetEntry = entryId
      ? await this.entriesService.findEntryForUser(entryId, userId)
      : (await this.entriesService.findLatestConfirmedEntry(userId)) ||
        (await this.entriesService.findLatestEntry(userId));
    if (!targetEntry) return [];

    return this.predictionModel
      .find({ entry: targetEntry._id })
      .populate({
        path: 'match',
        populate: [
          { path: 'team1' },
          { path: 'team2' },
          { path: 'group' },
        ],
      })
      .exec();
  }

  async getProgress(
    userId: string,
    entryId?: string,
  ): Promise<{
    filled: number;
    total: number;
    percentage: number;
  }> {
    const total = await this.matchesService.countGroupStage();
    const targetEntry = entryId
      ? await this.entriesService.findEntryForUser(entryId, userId)
      : (await this.entriesService.findLatestConfirmedEntry(userId)) ||
        (await this.entriesService.findLatestEntry(userId));
    if (!targetEntry) {
      return { filled: 0, total, percentage: 0 };
    }
    const groupMatchIds = await this.matchesService.getGroupStageMatchIds();
    const filled = await this.predictionModel
      .countDocuments({
        entry: targetEntry._id,
        match: { $in: groupMatchIds },
      })
      .exec();
    const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;
    return { filled, total, percentage };
  }

  async getAllProgress(): Promise<
    Record<string, { filled: number; total: number; percentage: number }>
  > {
    const total = await this.matchesService.countGroupStage();
    const groupMatchIds = await this.matchesService.getGroupStageMatchIds();

    const predictions = await this.predictionModel
      .find({ match: { $in: groupMatchIds } }, { user: 1 })
      .lean()
      .exec();

    const countByUser = new Map<string, number>();
    for (const p of predictions) {
      const uid = p.user.toString();
      countByUser.set(uid, (countByUser.get(uid) || 0) + 1);
    }

    const progressMap: Record<
      string,
      { filled: number; total: number; percentage: number }
    > = {};
    for (const [userId, filled] of countByUser) {
      progressMap[userId] = {
        filled,
        total,
        percentage: total > 0 ? Math.round((filled / total) * 100) : 0,
      };
    }
    return progressMap;
  }

  async calculatePoints(
    matchId: string,
    actualScore1: number,
    actualScore2: number,
  ): Promise<void> {
    const predictions = await this.predictionModel
      .find({ match: matchId })
      .exec();

    const actualOutcome = this.getOutcome(actualScore1, actualScore2);

    for (const prediction of predictions) {
      const predictedOutcome = this.getOutcome(
        prediction.score1,
        prediction.score2,
      );
      let points = 0;

      if (predictedOutcome === actualOutcome) {
        points = 1;
        if (
          prediction.score1 === actualScore1 &&
          prediction.score2 === actualScore2
        ) {
          points = 3;
        }
      }

      prediction.points = points;
      await prediction.save();
    }
  }

  async clearPoints(matchId: string): Promise<void> {
    await this.predictionModel.updateMany(
      { match: matchId },
      { points: null },
    );
  }

  async getAllPredictionsForMatch(matchId: string): Promise<Prediction[]> {
    return this.predictionModel
      .find({ match: matchId })
      .populate('user', '-password')
      .exec();
  }

  /**
   * Returns every player's prediction for a match, including which entry each
   * came from. Used by the public match-detail page for transparency.
   */
  async getPublicPredictionsForMatch(matchId: string) {
    if (!Types.ObjectId.isValid(matchId)) return [];
    const preds = await this.predictionModel
      .find({ match: matchId })
      .populate('user', 'firstName lastName profilePicture role')
      .populate('entry', 'entryNumber status paymentStatus')
      .exec();

    return preds
      .filter((p: any) => p.user && p.user.role !== 'admin' && p.entry)
      .map((p: any) => ({
        _id: p._id.toString(),
        score1: p.score1,
        score2: p.score2,
        points: p.points,
        entryId: p.entry?._id?.toString?.() ?? null,
        entryNumber: p.entry?.entryNumber ?? null,
        user: {
          _id: p.user._id.toString(),
          firstName: p.user.firstName,
          lastName: p.user.lastName,
          profilePicture: p.user.profilePicture ?? null,
        },
      }));
  }

  /**
   * Aggregates how the community predicted each match: how many players picked
   * team1 to win, a draw, or team2 to win. Admin predictions are excluded.
   * Returns a map keyed by matchId. Used for the community sentiment bars.
   */
  async getPredictionStats(): Promise<
    Record<
      string,
      { team1: number; draw: number; team2: number; total: number }
    >
  > {
    // Uses the same populate + filter path as getPublicPredictionsForMatch so
    // the list-page bars can never disagree with the match-detail bars.
    const preds = await this.predictionModel
      .find({}, { match: 1, score1: 1, score2: 1, user: 1, entry: 1 })
      .populate('user', 'role')
      .populate('entry', '_id')
      .lean()
      .exec();

    const map: Record<
      string,
      { team1: number; draw: number; team2: number; total: number }
    > = {};

    for (const p of preds as any[]) {
      if (!p.user || p.user.role === 'admin' || !p.entry) continue;
      const key = p.match?.toString();
      if (!key) continue;
      if (!map[key]) {
        map[key] = { team1: 0, draw: 0, team2: 0, total: 0 };
      }
      if (p.score1 > p.score2) map[key].team1++;
      else if (p.score1 < p.score2) map[key].team2++;
      else map[key].draw++;
      map[key].total++;
    }

    return map;
  }

  /**
   * Full snapshot of every prediction as CSV, for admin audit / corroboration
   * after the deadline locks. Includes player, entry, match and timestamps so
   * the admin can verify nothing changed.
   */
  async exportPredictionsCsv(): Promise<string> {
    const preds = await this.predictionModel
      .find()
      .populate('user', 'firstName lastName email role')
      .populate('entry', 'entryNumber status paymentStatus')
      .populate({
        path: 'match',
        populate: [{ path: 'team1' }, { path: 'team2' }, { path: 'group' }],
      })
      .sort({ entry: 1, match: 1 })
      .lean()
      .exec();

    const headers = [
      'predictionId',
      'entryNumber',
      'entryStatus',
      'paymentStatus',
      'playerFirstName',
      'playerLastName',
      'playerEmail',
      'userRole',
      'matchNumber',
      'stage',
      'round',
      'group',
      'team1',
      'team2',
      'predictedScore1',
      'predictedScore2',
      'predictedOutcome',
      'points',
      'matchStatus',
      'actualScore1',
      'actualScore2',
      'createdAt',
      'updatedAt',
    ];

    const teamName = (team: any, placeholder: any) =>
      team?.name ?? placeholder ?? '';

    const rows = preds.map((p: any) => {
      const u = p.user ?? {};
      const e = p.entry ?? {};
      const m = p.match ?? {};
      return [
        p._id?.toString() ?? '',
        e.entryNumber ?? '',
        e.status ?? '',
        e.paymentStatus ?? '',
        u.firstName ?? '',
        u.lastName ?? '',
        u.email ?? '',
        u.role ?? '',
        m.matchNumber ?? '',
        m.stage ?? '',
        m.round ?? '',
        m.group?.name ?? '',
        teamName(m.team1, m.team1Placeholder),
        teamName(m.team2, m.team2Placeholder),
        p.score1 ?? '',
        p.score2 ?? '',
        this.getOutcome(p.score1, p.score2),
        p.points ?? '',
        m.status ?? '',
        m.score1 ?? '',
        m.score2 ?? '',
        p.createdAt ? new Date(p.createdAt).toISOString() : '',
        p.updatedAt ? new Date(p.updatedAt).toISOString() : '',
      ];
    });

    const escape = (value: unknown): string => {
      const s = value === null || value === undefined ? '' : String(value);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    return [headers, ...rows]
      .map((row) => row.map(escape).join(','))
      .join('\r\n');
  }

  private getOutcome(score1: number, score2: number): string {
    if (score1 > score2) return 'team1';
    if (score1 < score2) return 'team2';
    return 'draw';
  }
}
