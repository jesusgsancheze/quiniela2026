import { Module } from '@nestjs/common';
import { SeederService } from './seeder.service.js';
import { TeamsModule } from '../teams/teams.module.js';
import { GroupsModule } from '../groups/groups.module.js';
import { MatchesModule } from '../matches/matches.module.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [TeamsModule, GroupsModule, MatchesModule, UsersModule],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}
