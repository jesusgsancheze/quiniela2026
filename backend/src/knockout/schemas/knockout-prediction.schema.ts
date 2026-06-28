import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * A single knockout-match prediction within a player's personal bracket.
 *
 * `score1`/`score2` are aligned to the match's structural slots (slot 1 = the
 * "top" feeder / placeholder1, slot 2 = placeholder2). `advances` records which
 * slot the player sends through — implied by a decisive score, but required
 * (and authoritative) when the player predicts a tie decided on penalties.
 */
@Schema({ timestamps: true })
export class KnockoutPrediction extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'KnockoutEntry', required: true })
  entry: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Match', required: true })
  match: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  score1: number;

  @Prop({ required: true, min: 0 })
  score2: number;

  @Prop({ type: String, enum: ['team1', 'team2'], required: true })
  advances: 'team1' | 'team2';

  @Prop({ type: Number, default: null })
  points: number | null;

  // The base outcome of the pick, independent of the champion bonus, so the
  // leaderboard can count exact vs correct results unambiguously.
  @Prop({ type: String, enum: ['exact', 'correct', 'miss', null], default: null })
  result: 'exact' | 'correct' | 'miss' | null;
}

export const KnockoutPredictionSchema =
  SchemaFactory.createForClass(KnockoutPrediction);
KnockoutPredictionSchema.index({ entry: 1, match: 1 }, { unique: true });
KnockoutPredictionSchema.index({ user: 1 });
