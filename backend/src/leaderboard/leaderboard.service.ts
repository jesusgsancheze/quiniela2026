import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Prediction } from '../predictions/schemas/prediction.schema.js';
import { User } from '../users/schemas/user.schema.js';
import { Entry } from '../entries/schemas/entry.schema.js';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectModel(Prediction.name)
    private predictionModel: Model<Prediction>,
    @InjectModel(User.name)
    private userModel: Model<User>,
    @InjectModel(Entry.name)
    private entryModel: Model<Entry>,
  ) {}

  async getRankings() {
    // Group predictions by (user, entry) — every entry is its own row.
    const grouped = await this.predictionModel.aggregate([
      {
        $match: { entry: { $ne: null } },
      },
      {
        $group: {
          _id: { user: '$user', entry: '$entry' },
          totalPoints: { $sum: '$points' },
          matchesScored: {
            $sum: {
              $cond: [{ $gt: ['$points', null] }, 1, 0],
            },
          },
        },
      },
    ]);

    if (grouped.length === 0) return [];

    const userIds = Array.from(
      new Set(grouped.map((g) => g._id.user.toString())),
    );
    const entryIds = Array.from(
      new Set(grouped.map((g) => g._id.entry.toString())),
    );

    const [users, entries] = await Promise.all([
      this.userModel.find({ _id: { $in: userIds } }, { password: 0 }).exec(),
      this.entryModel.find({ _id: { $in: entryIds } }).exec(),
    ]);

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const entryMap = new Map(entries.map((e) => [e._id.toString(), e]));

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
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.totalPoints - a!.totalPoints);

    return results.map((r, i) => ({ ...r, rank: i + 1 }));
  }
}
