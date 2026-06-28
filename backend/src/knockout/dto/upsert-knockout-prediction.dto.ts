import { IsString, IsInt, Min, IsOptional, IsIn } from 'class-validator';

export class UpsertKnockoutPredictionDto {
  @IsString()
  matchId: string;

  @IsInt()
  @Min(0)
  score1: number;

  @IsInt()
  @Min(0)
  score2: number;

  @IsIn(['team1', 'team2'])
  advances: 'team1' | 'team2';

  @IsOptional()
  @IsString()
  entryId?: string;
}
