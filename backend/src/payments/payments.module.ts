import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsService } from './payments.service.js';
import { PaymentsController } from './payments.controller.js';
import {
  PaymentConfig,
  PaymentConfigSchema,
} from './schemas/payment-config.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentConfig.name, schema: PaymentConfigSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
