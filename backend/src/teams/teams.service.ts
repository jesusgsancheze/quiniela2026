import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team } from './schemas/team.schema.js';

@Injectable()
export class TeamsService {
  constructor(@InjectModel(Team.name) private teamModel: Model<Team>) {}

  async upsert(name: string, code: string, flagUrl?: string): Promise<Team> {
    return this.teamModel
      .findOneAndUpdate(
        { code },
        { name, code, flagUrl: flagUrl || null },
        { upsert: true, new: true },
      )
      .exec() as Promise<Team>;
  }

  async findByCode(code: string): Promise<Team | null> {
    return this.teamModel.findOne({ code }).exec();
  }

  async findAll(): Promise<Team[]> {
    return this.teamModel.find().populate('group').exec();
  }

  async setGroup(teamId: string, groupId: string): Promise<void> {
    await this.teamModel.findByIdAndUpdate(teamId, { group: groupId });
  }
}
