import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentConfig } from './schemas/payment-config.schema.js';
import { User } from '../users/schemas/user.schema.js';
import { UpdatePaymentConfigDto } from './dto/update-payment-config.dto.js';
import { EntriesService } from '../entries/entries.service.js';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(PaymentConfig.name)
    private paymentConfigModel: Model<PaymentConfig>,
    @InjectModel(User.name)
    private userModel: Model<User>,
    private entriesService: EntriesService,
  ) {}

  async getConfig(): Promise<PaymentConfig | null> {
    return this.paymentConfigModel.findOne().exec();
  }

  async upsertConfig(dto: UpdatePaymentConfigDto): Promise<PaymentConfig> {
    const existing = await this.paymentConfigModel.findOne().exec();
    if (existing) {
      Object.assign(existing, dto);
      return existing.save();
    }
    return new this.paymentConfigModel(dto).save();
  }

  async reportPayment(userId: string, note?: string): Promise<User> {
    await this.entriesService.reportPaymentForActiveEntry(userId, note);
    const user = await this.userModel.findById(userId).select('-password').exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Admin confirms the user's pending entry. Resolves the entry from the user
   * if no entryId is provided (legacy callers), else uses the given entry.
   */
  async confirmPayment(userId: string, entryId?: string): Promise<User> {
    const targetEntry = entryId
      ? await this.entriesService.findById(entryId)
      : await this.entriesService.findActiveEntry(userId);
    if (!targetEntry) throw new NotFoundException('Entry not found');
    if (entryId && targetEntry.user.toString() !== userId) {
      throw new BadRequestException('Entry does not belong to user');
    }
    await this.entriesService.confirmEntryPayment(targetEntry._id.toString());
    const user = await this.userModel.findById(userId).select('-password').exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async rejectPayment(userId: string, entryId?: string): Promise<User> {
    const targetEntry = entryId
      ? await this.entriesService.findById(entryId)
      : await this.entriesService.findActiveEntry(userId);
    if (!targetEntry) throw new NotFoundException('Entry not found');
    if (entryId && targetEntry.user.toString() !== userId) {
      throw new BadRequestException('Entry does not belong to user');
    }
    await this.entriesService.rejectEntryPayment(targetEntry._id.toString());
    const user = await this.userModel.findById(userId).select('-password').exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
