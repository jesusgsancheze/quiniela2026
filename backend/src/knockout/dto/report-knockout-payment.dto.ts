import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReportKnockoutPaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
