import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Group } from './schemas/group.schema.js';
import { Match } from '../matches/schemas/match.schema.js';
import { Team } from '../teams/schemas/team.schema.js';

export interface TeamStanding {
  teamId: string;
  teamName: string;
  teamCode: string;
  flagUrl: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface GroupStandings {
  groupId: string;
  groupName: string;
  standings: TeamStanding[];
}

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name) private groupModel: Model<Group>,
    @InjectModel(Match.name) private matchModel: Model<Match>,
    @InjectModel(Team.name) private teamModel: Model<Team>,
  ) {}

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

  async getStandings(): Promise<GroupStandings[]> {
    const groups = await this.groupModel.find().populate('teams').sort({ name: 1 }).exec();
    const finishedMatches = await this.matchModel
      .find({ stage: 'group', status: 'finished' })
      .exec();

    const result: GroupStandings[] = [];

    for (const group of groups) {
      const teamStats = new Map<string, TeamStanding>();

      for (const team of group.teams as unknown as Team[]) {
        teamStats.set(team._id.toString(), {
          teamId: team._id.toString(),
          teamName: team.name,
          teamCode: team.code,
          flagUrl: team.flagUrl,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        });
      }

      const groupMatches = finishedMatches.filter(
        (m) => m.group && m.group.toString() === group._id.toString(),
      );

      for (const match of groupMatches) {
        if (match.score1 == null || match.score2 == null) continue;
        const t1Id = match.team1?.toString();
        const t2Id = match.team2?.toString();
        if (!t1Id || !t2Id) continue;

        const t1 = teamStats.get(t1Id);
        const t2 = teamStats.get(t2Id);
        if (!t1 || !t2) continue;

        t1.played++;
        t2.played++;
        t1.goalsFor += match.score1;
        t1.goalsAgainst += match.score2;
        t2.goalsFor += match.score2;
        t2.goalsAgainst += match.score1;

        if (match.score1 > match.score2) {
          t1.won++;
          t1.points += 3;
          t2.lost++;
        } else if (match.score1 < match.score2) {
          t2.won++;
          t2.points += 3;
          t1.lost++;
        } else {
          t1.drawn++;
          t2.drawn++;
          t1.points += 1;
          t2.points += 1;
        }
      }

      const standings = Array.from(teamStats.values()).map((t) => ({
        ...t,
        goalDifference: t.goalsFor - t.goalsAgainst,
      }));

      standings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      });

      result.push({
        groupId: group._id.toString(),
        groupName: group.name,
        standings,
      });
    }

    return result;
  }
}
