import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Group } from './schemas/group.schema.js';

@Injectable()
export class GroupsService {
  constructor(@InjectModel(Group.name) private groupModel: Model<Group>) {}

  async upsert(name: string): Promise<Group> {
    return this.groupModel
      .findOneAndUpdate({ name }, { name }, { upsert: true, new: true })
      .exec() as Promise<Group>;
  }

  async addTeam(groupId: string, teamId: string): Promise<void> {
    await this.groupModel.findByIdAndUpdate(groupId, {
      $addToSet: { teams: teamId },
    });
  }

  async findAll(): Promise<Group[]> {
    return this.groupModel.find().populate('teams').exec();
  }

  async findByName(name: string): Promise<Group | null> {
    return this.groupModel.findOne({ name }).exec();
  }
}
