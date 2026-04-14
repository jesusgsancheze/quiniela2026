import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Prediction } from '../predictions/schemas/prediction.schema.js';
import { User } from '../users/schemas/user.schema.js';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectModel(Prediction.name)
    private predictionModel: Model<Prediction>,
    @InjectModel(User.name)
    private userModel: Model<User>,
  ) {}

  async getRankings() {
    // Get all predictions grouped by user
    const grouped = await this.predictionModel.aggregate([
      {
        $group: {
          _id: '$user',
          totalPoints: { $sum: '$points' },
          matchesScored: {
            $sum: {
              $cond: [{ $gt: ['$points', null] }, 1, 0],
            },
          },
        },
      },
      { $sort: { totalPoints: -1 } },
    ]);

    if (grouped.length === 0) return [];

    // Fetch user details for all grouped users
    const userIds = grouped.map((g) => g._id);
    const users = await this.userModel
      .find({ _id: { $in: userIds } }, { password: 0 })
      .exec();

    const userMap = new Map(
      users.map((u) => [u._id.toString(), u]),
    );

    const results = grouped
      .map((g) => {
        const user = userMap.get(g._id.toString());
        if (!user || user.role === 'admin') return null;
        return {
          userId: g._id.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profilePicture: user.profilePicture,
          totalPoints: g.totalPoints || 0,
          matchesScored: g.matchesScored || 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.totalPoints - a!.totalPoints);

    return results.map((r, i) => ({ ...r, rank: i + 1 }));
  }
}
