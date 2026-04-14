import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Match } from './schemas/match.schema.js';

@Injectable()
export class MatchesService {
  constructor(@InjectModel(Match.name) private matchModel: Model<Match>) {}

  async findAll(filters?: {
    stage?: string;
    group?: string;
    status?: string;
  }): Promise<Match[]> {
    const query: Record<string, unknown> = {};
    if (filters?.stage) query.stage = filters.stage;
    if (filters?.group) query.group = filters.group;
    if (filters?.status) query.status = filters.status;

    return this.matchModel
      .find(query)
      .populate('team1')
      .populate('team2')
      .populate('group')
      .sort({ date: 1, matchNumber: 1 })
      .exec();
  }

  async findById(id: string): Promise<Match> {
    const match = await this.matchModel
      .findById(id)
      .populate('team1')
      .populate('team2')
      .populate('group')
      .exec();
    if (!match) {
      throw new NotFoundException('Match not found');
    }
    return match;
  }

  async setResult(
    matchId: string,
    score1: number,
    score2: number,
  ): Promise<Match> {
    const match = await this.matchModel
      .findByIdAndUpdate(
        matchId,
        { score1, score2, status: 'finished' },
        { new: true },
      )
      .populate('team1')
      .populate('team2')
      .populate('group')
      .exec();
    if (!match) {
      throw new NotFoundException('Match not found');
    }
    return match;
  }

  async upsertByNumber(data: Partial<Match> & { matchNumber: number }): Promise<Match> {
    return this.matchModel
      .findOneAndUpdate({ matchNumber: data.matchNumber }, data, {
        upsert: true,
        new: true,
      })
      .exec() as Promise<Match>;
  }

  async clearResult(matchId: string): Promise<Match> {
    const match = await this.matchModel
      .findByIdAndUpdate(
        matchId,
        { score1: null, score2: null, status: 'scheduled' },
        { new: true },
      )
      .populate('team1')
      .populate('team2')
      .populate('group')
      .exec();
    if (!match) {
      throw new NotFoundException('Match not found');
    }
    return match;
  }

  async countAll(): Promise<number> {
    return this.matchModel.countDocuments().exec();
  }

  async countGroupStage(): Promise<number> {
    return this.matchModel.countDocuments({ stage: 'group' }).exec();
  }

  async getGroupStageMatchIds(): Promise<string[]> {
    const matches = await this.matchModel
      .find({ stage: 'group' }, { _id: 1 })
      .exec();
    return matches.map((m) => m._id.toString());
  }
}
