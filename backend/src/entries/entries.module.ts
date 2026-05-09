import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EntriesService } from './entries.service.js';
import { EntriesController } from './entries.controller.js';
import { Entry, EntrySchema } from './schemas/entry.schema.js';
import {
  Prediction,
  PredictionSchema,
} from '../predictions/schemas/prediction.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { MatchesModule } from '../matches/matches.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Entry.name, schema: EntrySchema },
      { name: Prediction.name, schema: PredictionSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => MatchesModule),
  ],
  controllers: [EntriesController],
  providers: [EntriesService],
  exports: [EntriesService, MongooseModule],
})
export class EntriesModule {}
