import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Entry } from './schemas/entry.schema.js';
import { Prediction } from '../predictions/schemas/prediction.schema.js';
import { User } from '../users/schemas/user.schema.js';
import { MatchesService } from '../matches/matches.service.js';

@Injectable()
export class EntriesService implements OnModuleInit {
  private readonly logger = new Logger(EntriesService.name);

  constructor(
    @InjectModel(Entry.name) private entryModel: Model<Entry>,
    @InjectModel(Prediction.name) private predictionModel: Model<Prediction>,
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(forwardRef(() => MatchesService))
    private matchesService: MatchesService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.runOneTimeMigration();
  }

  /**
   * Idempotent migration: for any user without an Entry, create Entry #1
   * mirroring their current paymentStatus/paymentNote and link all of their
   * existing predictions to it. Drops the legacy { user, match } unique index
   * if still present so the new { entry, match } index can take over.
   */
  private async runOneTimeMigration(): Promise<void> {
    const users = await this.userModel.find({}, { _id: 1, paymentStatus: 1, paymentNote: 1 }).lean().exec();
    const userIdsWithEntry = new Set(
      (await this.entryModel.distinct('user')).map((id) => id.toString()),
    );

    let createdEntries = 0;
    let backfilledPredictions = 0;

    for (const user of users) {
      const userId = user._id.toString();
      if (userIdsWithEntry.has(userId)) continue;

      const entry = await this.entryModel.create({
        user: user._id,
        entryNumber: 1,
        paymentStatus: user.paymentStatus || 'pending',
        paymentNote: user.paymentNote || null,
        status: 'active',
        completedAt: null,
      });
      createdEntries++;

      const res = await this.predictionModel.updateMany(
        { user: user._id, $or: [{ entry: { $exists: false } }, { entry: null }] },
        { $set: { entry: entry._id } },
      );
      backfilledPredictions += res.modifiedCount || 0;

      // If their predictions already cover all group-stage matches,
      // mark the entry as completed.
      const total = await this.matchesService.countGroupStage();
      if (total > 0) {
        const groupMatchIds = await this.matchesService.getGroupStageMatchIds();
        const filled = await this.predictionModel.countDocuments({
          entry: entry._id,
          match: { $in: groupMatchIds },
        });
        if (filled >= total) {
          entry.status = 'completed';
          entry.completedAt = new Date();
          await entry.save();
        }
      }
    }

    if (createdEntries > 0 || backfilledPredictions > 0) {
      this.logger.log(
        `Entry migration: created ${createdEntries} entries, linked ${backfilledPredictions} predictions`,
      );
    }

    // Drop legacy index { user: 1, match: 1 } if it still exists.
    try {
      const indexes = await this.predictionModel.collection.indexes();
      const legacy = indexes.find(
        (ix) =>
          ix.name &&
          ix.key &&
          ix.key.user === 1 &&
          ix.key.match === 1 &&
          !('entry' in (ix.key as Record<string, unknown>)),
      );
      if (legacy?.name) {
        await this.predictionModel.collection.dropIndex(legacy.name);
        this.logger.log(`Dropped legacy prediction index: ${legacy.name}`);
      }
    } catch (err) {
      this.logger.warn(`Could not check/drop legacy prediction index: ${(err as Error).message}`);
    }
  }

  async findActiveEntry(userId: string): Promise<Entry | null> {
    return this.entryModel
      .findOne({ user: new Types.ObjectId(userId), status: 'active' })
      .sort({ entryNumber: -1 })
      .exec();
  }

  async findLatestEntry(userId: string): Promise<Entry | null> {
    return this.entryModel
      .findOne({ user: new Types.ObjectId(userId) })
      .sort({ entryNumber: -1 })
      .exec();
  }

  async findByUser(userId: string): Promise<Entry[]> {
    return this.entryModel
      .find({ user: new Types.ObjectId(userId) })
      .sort({ entryNumber: -1 })
      .exec();
  }

  async findById(id: string): Promise<Entry | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.entryModel.findById(id).exec();
  }

  async createNewEntry(userId: string): Promise<Entry> {
    const latest = await this.findLatestEntry(userId);
    if (latest && latest.status !== 'completed') {
      throw new BadRequestException(
        'You already have an active entry. Complete it before requesting a new one.',
      );
    }
    const nextNumber = latest ? latest.entryNumber + 1 : 1;
    return this.entryModel.create({
      user: new Types.ObjectId(userId),
      entryNumber: nextNumber,
      paymentStatus: 'pending',
      paymentNote: null,
      status: 'active',
      completedAt: null,
    });
  }

  async reportPaymentForActiveEntry(
    userId: string,
    note?: string,
  ): Promise<Entry> {
    const entry = await this.findActiveEntry(userId);
    if (!entry) {
      throw new NotFoundException('No active entry to report payment for');
    }
    if (entry.paymentStatus === 'confirmed') {
      throw new BadRequestException('Payment for this entry is already confirmed');
    }
    entry.paymentStatus = 'reported';
    entry.paymentNote = note ?? null;
    await entry.save();
    await this.syncUserPaymentMirror(userId);
    return entry;
  }

  async confirmEntryPayment(entryId: string): Promise<Entry> {
    const entry = await this.entryModel.findById(entryId).exec();
    if (!entry) throw new NotFoundException('Entry not found');
    entry.paymentStatus = 'confirmed';
    await entry.save();
    await this.syncUserPaymentMirror(entry.user.toString());
    return entry;
  }

  async rejectEntryPayment(entryId: string): Promise<Entry> {
    const entry = await this.entryModel.findById(entryId).exec();
    if (!entry) throw new NotFoundException('Entry not found');
    entry.paymentStatus = 'pending';
    entry.paymentNote = null;
    await entry.save();
    await this.syncUserPaymentMirror(entry.user.toString());
    return entry;
  }

  /**
   * Mark an entry as completed if the user has filled every group-stage match
   * for that entry. Called after a prediction upsert.
   */
  async maybeMarkCompleted(entry: Entry): Promise<Entry> {
    if (entry.status === 'completed') return entry;
    const total = await this.matchesService.countGroupStage();
    if (total === 0) return entry;
    const groupMatchIds = await this.matchesService.getGroupStageMatchIds();
    const filled = await this.predictionModel.countDocuments({
      entry: entry._id,
      match: { $in: groupMatchIds },
    });
    if (filled >= total) {
      entry.status = 'completed';
      entry.completedAt = new Date();
      await entry.save();
    }
    return entry;
  }

  /**
   * Throws if the entry is not in a state that allows submitting predictions.
   */
  ensureCanPredict(entry: Entry | null): Entry {
    if (!entry) {
      throw new ForbiddenException(
        'You do not have an active entry. Request a new prediction first.',
      );
    }
    if (entry.paymentStatus !== 'confirmed') {
      throw new ForbiddenException(
        'Entry payment is not confirmed yet.',
      );
    }
    if (entry.status === 'completed') {
      throw new ForbiddenException(
        'This entry is already complete. Request a new prediction to keep playing.',
      );
    }
    return entry;
  }

  /**
   * Mirrors the latest entry's paymentStatus onto the User so that legacy
   * checks (e.g. account activation flows) keep working without changes.
   */
  private async syncUserPaymentMirror(userId: string): Promise<void> {
    const latest = await this.findLatestEntry(userId);
    if (!latest) return;
    await this.userModel.findByIdAndUpdate(userId, {
      paymentStatus: latest.paymentStatus,
      paymentNote: latest.paymentNote,
    });
  }

  async listAll(): Promise<Entry[]> {
    return this.entryModel
      .find()
      .sort({ user: 1, entryNumber: 1 })
      .exec();
  }

  /**
   * Returns a map of userId → entry summaries (with per-entry progress).
   * Used by the admin players page so it can render entry history + drive
   * approve/reject buttons on the correct entry.
   */
  async getEntriesWithProgressByUser(): Promise<
    Record<
      string,
      Array<{
        _id: string;
        entryNumber: number;
        paymentStatus: string;
        paymentNote: string | null;
        status: string;
        completedAt: Date | null;
        progress: { filled: number; total: number; percentage: number };
      }>
    >
  > {
    const total = await this.matchesService.countGroupStage();
    const groupMatchIds = await this.matchesService.getGroupStageMatchIds();

    const entries = await this.entryModel.find().lean().exec();
    if (entries.length === 0) return {};

    // Count predictions per entry in one query.
    const counts = await this.predictionModel.aggregate([
      { $match: { match: { $in: groupMatchIds } } },
      { $group: { _id: '$entry', count: { $sum: 1 } } },
    ]);
    const countByEntry = new Map<string, number>(
      counts.map((c) => [c._id?.toString(), c.count]),
    );

    const byUser: Record<
      string,
      Array<{
        _id: string;
        entryNumber: number;
        paymentStatus: string;
        paymentNote: string | null;
        status: string;
        completedAt: Date | null;
        progress: { filled: number; total: number; percentage: number };
      }>
    > = {};

    for (const e of entries) {
      const uid = e.user.toString();
      const filled = countByEntry.get(e._id.toString()) || 0;
      const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;
      if (!byUser[uid]) byUser[uid] = [];
      byUser[uid].push({
        _id: e._id.toString(),
        entryNumber: e.entryNumber,
        paymentStatus: e.paymentStatus,
        paymentNote: e.paymentNote ?? null,
        status: e.status,
        completedAt: e.completedAt ?? null,
        progress: { filled, total, percentage },
      });
    }

    for (const uid of Object.keys(byUser)) {
      byUser[uid].sort((a, b) => b.entryNumber - a.entryNumber);
    }

    return byUser;
  }
}
