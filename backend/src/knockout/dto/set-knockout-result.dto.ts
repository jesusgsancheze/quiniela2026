import { IsInt, Min, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class SetKnockoutResultDto {
  @IsInt()
  @Min(0)
  score1: number;

  @IsInt()
  @Min(0)
  score2: number;

  @IsOptional()
  @IsBoolean()
  decidedOnPenalties?: boolean;

  @IsOptional()
  @IsIn(['team1', 'team2'])
  penaltyWinner?: 'team1' | 'team2';

  @IsOptional()
  @IsBoolean()
  live?: boolean;
}
