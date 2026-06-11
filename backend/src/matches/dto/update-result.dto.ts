import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateResultDto {
  @IsInt()
  @Min(0)
  score1: number;

  @IsInt()
  @Min(0)
  score2: number;

  // When true, the match keeps a result but is shown as "in progress".
  @IsOptional()
  @IsBoolean()
  live?: boolean;
}
