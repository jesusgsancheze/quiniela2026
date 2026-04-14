import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentConfig } from './schemas/payment-config.schema.js';
import { User } from '../users/schemas/user.schema.js';
import { UpdatePaymentConfigDto } from './dto/update-payment-config.dto.js';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(PaymentConfig.name)
    private paymentConfigModel: Model<PaymentConfig>,
    @InjectModel(User.name)
    private userModel: Model<User>,
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
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { paymentStatus: 'reported', paymentNote: note || null },
        { new: true },
      )
      .select('-password')
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async confirmPayment(userId: string): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { paymentStatus: 'confirmed' },
        { new: true },
      )
      .select('-password')
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async rejectPayment(userId: string): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { paymentStatus: 'pending', paymentNote: null },
        { new: true },
      )
      .select('-password')
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
