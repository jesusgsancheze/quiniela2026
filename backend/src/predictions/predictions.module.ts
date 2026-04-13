import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PredictionsService } from './predictions.service.js';
import { PredictionsController } from './predictions.controller.js';
import { Prediction, PredictionSchema } from './schemas/prediction.schema.js';
import { MatchesModule } from '../matches/matches.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Prediction.name, schema: PredictionSchema },
    ]),
    forwardRef(() => MatchesModule),
  ],
  controllers: [PredictionsController],
  providers: [PredictionsService],
  exports: [PredictionsService],
})
export class PredictionsModule {}
