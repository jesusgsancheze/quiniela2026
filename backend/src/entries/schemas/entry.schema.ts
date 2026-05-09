import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EntryStatus = 'active' | 'completed';
export type EntryPaymentStatus = 'pending' | 'reported' | 'confirmed';

@Schema({ timestamps: true })
export class Entry extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  entryNumber: number;

  @Prop({
    type: String,
    enum: ['pending', 'reported', 'confirmed'],
    default: 'pending',
  })
  paymentStatus: EntryPaymentStatus;

  @Prop({ type: String, default: null })
  paymentNote: string | null;

  @Prop({
    type: String,
    enum: ['active', 'completed'],
    default: 'active',
  })
  status: EntryStatus;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;
}

export const EntrySchema = SchemaFactory.createForClass(Entry);
EntrySchema.index({ user: 1, entryNumber: 1 }, { unique: true });
EntrySchema.index({ user: 1, status: 1 });
