import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Prediction extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Match', required: true })
  match: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  score1: number;

  @Prop({ required: true, min: 0 })
  score2: number;

  @Prop({ default: null })
  points: number | null;
}

export const PredictionSchema = SchemaFactory.createForClass(Prediction);
PredictionSchema.index({ user: 1, match: 1 }, { unique: true });
