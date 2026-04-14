import { IsOptional, IsString } from 'class-validator';

export class ReportPaymentDto {
  @IsOptional()
  @IsString()
  note?: string;
}
