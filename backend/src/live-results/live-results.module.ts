import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MatchesModule } from '../matches/matches.module.js';
import { PredictionsModule } from '../predictions/predictions.module.js';
import { TeamsModule } from '../teams/teams.module.js';
import { FootballDataProvider } from './football-data.provider.js';
import { LiveResultsService } from './live-results.service.js';
import { LiveResultsController } from './live-results.controller.js';
import {
  LiveSyncStatusDoc,
  LiveSyncStatusSchema,
} from './schemas/live-sync-status.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LiveSyncStatusDoc.name, schema: LiveSyncStatusSchema },
    ]),
    MatchesModule,
    PredictionsModule,
    TeamsModule,
  ],
  controllers: [LiveResultsController],
  providers: [FootballDataProvider, LiveResultsService],
  exports: [LiveResultsService],
})
export class LiveResultsModule {}
