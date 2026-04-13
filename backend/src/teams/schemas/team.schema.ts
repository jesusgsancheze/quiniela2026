import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Team extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ default: null })
  flagUrl: string;

  @Prop({ type: Types.ObjectId, ref: 'Group', default: null })
  group: Types.ObjectId;
}

export const TeamSchema = SchemaFactory.createForClass(Team);
