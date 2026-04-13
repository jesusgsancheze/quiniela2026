import { IsInt, Min } from 'class-validator';

export class UpdateResultDto {
  @IsInt()
  @Min(0)
  score1: number;

  @IsInt()
  @Min(0)
  score2: number;
}
