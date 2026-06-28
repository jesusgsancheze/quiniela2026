import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type KnockoutEntryStatus = 'active' | 'completed';
export type KnockoutPaymentStatus = 'pending' | 'reported' | 'confirmed';

/**
 * Phase-2 (knockout bracket) entry. Completely separate from the group-stage
 * `Entry` so the two phases never mix. Reuses the same payment lifecycle
 * (pending -> reported -> confirmed) handled by an admin.
 */
@Schema({ timestamps: true })
export class KnockoutEntry extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  entryNumber: number;

  @Prop({
    type: String,
    enum: ['pending', 'reported', 'confirmed'],
    default: 'pending',
  })
  paymentStatus: KnockoutPaymentStatus;

  @Prop({ type: String, default: null })
  paymentNote: string | null;

  @Prop({ type: String, enum: ['active', 'completed'], default: 'active' })
  status: KnockoutEntryStatus;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;
}

export const KnockoutEntrySchema = SchemaFactory.createForClass(KnockoutEntry);
KnockoutEntrySchema.index({ user: 1, entryNumber: 1 }, { unique: true });
KnockoutEntrySchema.index({ user: 1, status: 1 });
