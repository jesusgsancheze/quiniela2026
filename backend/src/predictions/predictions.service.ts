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

@Injectable()
export class PredictionsService {
  private readonly deadline: Date;

  constructor(
    @InjectModel(Prediction.name) private predictionModel: Model<Prediction>,
    @Inject(forwardRef(() => MatchesService))
    private matchesService: MatchesService,
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
  ): Promise<Prediction> {
    if (new Date() >= this.deadline) {
      throw new ForbiddenException(
        'Predictions are locked. The tournament has started.',
      );
    }

    return this.predictionModel
      .findOneAndUpdate(
        { user: userId, match: matchId },
        { user: userId, match: matchId, score1, score2, points: null },
        { upsert: true, new: true },
      )
      .exec() as Promise<Prediction>;
  }

  async findByUser(
    userId: string,
    filled?: string,
  ): Promise<Prediction[]> {
    const query: Record<string, unknown> = { user: userId };

    const predictions = await this.predictionModel
      .find(query)
      .populate({
        path: 'match',
        populate: [
          { path: 'team1' },
          { path: 'team2' },
          { path: 'group' },
        ],
      })
      .exec();

    return predictions;
  }

  async getProgress(userId: string): Promise<{
    filled: number;
    total: number;
    percentage: number;
  }> {
    const total = await this.matchesService.countGroupStage();
    const groupMatchIds = await this.matchesService.getGroupStageMatchIds();
    const filled = await this.predictionModel
      .countDocuments({ user: userId, match: { $in: groupMatchIds } })
      .exec();
    const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;
    return { filled, total, percentage };
  }

  async getAllProgress(): Promise<
    Record<string, { filled: number; total: number; percentage: number }>
  > {
    const total = await this.matchesService.countGroupStage();
    const groupMatchIds = await this.matchesService.getGroupStageMatchIds();

    // Use find + manual grouping instead of aggregate to avoid ObjectId casting issues
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

  private getOutcome(score1: number, score2: number): string {
    if (score1 > score2) return 'team1';
    if (score1 < score2) return 'team2';
    return 'draw';
  }
}
