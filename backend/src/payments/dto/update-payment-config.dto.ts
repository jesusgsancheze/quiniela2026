import {
  IsNumber,
  IsString,
  IsArray,
  IsOptional,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class PaymentMethodDto {
  @IsString()
  label: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  details?: string;
}

export class UpdatePaymentConfigDto {
  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  currency: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentMethodDto)
  paymentMethods: PaymentMethodDto[];

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;
}
