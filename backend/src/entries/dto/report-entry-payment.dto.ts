import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReportEntryPaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
