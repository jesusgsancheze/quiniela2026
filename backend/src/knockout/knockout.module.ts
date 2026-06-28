import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KnockoutService } from './knockout.service.js';
import { KnockoutBracketService } from './knockout-bracket.service.js';
import { KnockoutController } from './knockout.controller.js';
import {
  KnockoutEntry,
  KnockoutEntrySchema,
} from './schemas/knockout-entry.schema.js';
import {
  KnockoutPrediction,
  KnockoutPredictionSchema,
} from './schemas/knockout-prediction.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { GroupsModule } from '../groups/groups.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: KnockoutEntry.name, schema: KnockoutEntrySchema },
      { name: KnockoutPrediction.name, schema: KnockoutPredictionSchema },
      { name: User.name, schema: UserSchema },
    ]),
    // Provides GroupsService + the Match, Team and Group models.
    GroupsModule,
  ],
  controllers: [KnockoutController],
  providers: [KnockoutService, KnockoutBracketService],
  exports: [KnockoutService, KnockoutBracketService],
})
export class KnockoutModule {}
