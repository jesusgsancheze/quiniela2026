import { IsString, IsInt, Min } from 'class-validator';

export class UpsertPredictionDto {
  @IsString()
  matchId: string;

  @IsInt()
  @Min(0)
  score1: number;

  @IsInt()
  @Min(0)
  score2: number;
}
