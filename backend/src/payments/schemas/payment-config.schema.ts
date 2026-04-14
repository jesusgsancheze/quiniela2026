import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class PaymentMethod {
  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  value: string;

  @Prop({ default: '' })
  details: string;
}

export const PaymentMethodSchema = SchemaFactory.createForClass(PaymentMethod);

@Schema({ timestamps: true })
export class PaymentConfig extends Document {
  @Prop({ required: true })
  price: number;

  @Prop({ required: true, default: 'MXN' })
  currency: string;

  @Prop({ type: [PaymentMethodSchema], default: [] })
  paymentMethods: PaymentMethod[];

  @Prop({ default: '' })
  instructions: string;

  @Prop({ default: '' })
  contactEmail: string;

  @Prop({ default: '' })
  contactPhone: string;
}

export const PaymentConfigSchema = SchemaFactory.createForClass(PaymentConfig);
