import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Prediction } from '../predictions/schemas/prediction.schema.js';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectModel(Prediction.name)
    private predictionModel: Model<Prediction>,
  ) {}

  async getRankings(): Promise<
    {
      rank: number;
      userId: string;
      firstName: string;
      lastName: string;
      email: string;
      profilePicture: string | null;
      totalPoints: number;
      matchesScored: number;
    }[]
  > {
    const results = await this.predictionModel
      .aggregate([
        { $match: { points: { $ne: null } } },
        {
          $group: {
            _id: '$user',
            totalPoints: { $sum: '$points' },
            matchesScored: { $count: {} },
          },
        },
        { $sort: { totalPoints: -1 } },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userInfo',
          },
        },
        { $unwind: '$userInfo' },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            firstName: '$userInfo.firstName',
            lastName: '$userInfo.lastName',
            email: '$userInfo.email',
            profilePicture: '$userInfo.profilePicture',
            totalPoints: 1,
            matchesScored: 1,
          },
        },
      ])
      .exec();

    return results.map((r, i) => ({ ...r, rank: i + 1 }));
  }
}
