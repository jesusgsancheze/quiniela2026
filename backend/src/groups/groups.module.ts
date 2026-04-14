import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupsService } from './groups.service.js';
import { GroupsController } from './groups.controller.js';
import { Group, GroupSchema } from './schemas/group.schema.js';
import { Match, MatchSchema } from '../matches/schemas/match.schema.js';
import { Team, TeamSchema } from '../teams/schemas/team.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: Match.name, schema: MatchSchema },
      { name: Team.name, schema: TeamSchema },
    ]),
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService, MongooseModule],
})
export class GroupsModule {}
