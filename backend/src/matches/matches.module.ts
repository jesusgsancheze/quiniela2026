import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MatchesService } from './matches.service.js';
import { MatchesController } from './matches.controller.js';
import { Match, MatchSchema } from './schemas/match.schema.js';
import { PredictionsModule } from '../predictions/predictions.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Match.name, schema: MatchSchema }]),
    forwardRef(() => PredictionsModule),
  ],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService, MongooseModule],
})
export class MatchesModule {}
