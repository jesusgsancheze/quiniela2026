import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Match extends Document {
  @Prop({ required: true, unique: true })
  matchNumber: number;

  @Prop({ required: true })
  round: string;

  @Prop({
    required: true,
    enum: ['group', 'round32', 'round16', 'quarter', 'semi', 'third', 'final'],
  })
  stage: string;

  @Prop({ type: Types.ObjectId, ref: 'Group', default: null })
  group: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Team', default: null })
  team1: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Team', default: null })
  team2: Types.ObjectId;

  @Prop({ default: null })
  team1Placeholder: string;

  @Prop({ default: null })
  team2Placeholder: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ default: '' })
  venue: string;

  @Prop({ default: null })
  score1: number | null;

  @Prop({ default: null })
  score2: number | null;

  @Prop({ enum: ['scheduled', 'finished'], default: 'scheduled' })
  status: string;
}

export const MatchSchema = SchemaFactory.createForClass(Match);
MatchSchema.index({ date: 1 });
MatchSchema.index({ group: 1 });
MatchSchema.index({ stage: 1 });
