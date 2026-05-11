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

  private getOutcome(score1: number, score2: number): string {
    if (score1 > score2) return 'team1';
    if (score1 < score2) return 'team2';
    return 'draw';
  }
}
