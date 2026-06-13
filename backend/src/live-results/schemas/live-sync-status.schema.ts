import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Singleton document persisting the live-results worker's last snapshot so the
 * admin dashboard survives restarts/redeploys. Only one row ever exists,
 * identified by `key: 'singleton'`.
 */
@Schema({ timestamps: true, collection: 'livesyncstatus' })
export class LiveSyncStatusDoc extends Document {
  @Prop({ required: true, unique: true, default: 'singleton' })
  key: string;

  @Prop({ type: String, default: null })
  checkedAt: string | null;

  @Prop({ type: String, default: null })
  polledAt: string | null;

  @Prop({ default: false })
  inWindow: boolean;

  @Prop({ default: 0 })
  updated: number;

  @Prop({ default: 0 })
  unmatchedFixtures: number;

  @Prop({ type: [String], default: [] })
  unmatchedTeams: string[];

  @Prop({ type: [Object], default: [] })
  fixtures: Record<string, unknown>[];

  @Prop({ type: String, default: null })
  error: string | null;
}

export const LiveSyncStatusSchema = SchemaFactory.createForClass(LiveSyncStatusDoc);
