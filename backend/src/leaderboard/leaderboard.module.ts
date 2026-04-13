import { Module } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service.js';
import { LeaderboardController } from './leaderboard.controller.js';
import { PredictionsModule } from '../predictions/predictions.module.js';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Prediction,
  PredictionSchema,
} from '../predictions/schemas/prediction.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Prediction.name, schema: PredictionSchema },
    ]),
  ],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
})
export class LeaderboardModule {}
