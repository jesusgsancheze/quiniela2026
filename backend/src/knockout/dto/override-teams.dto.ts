import { IsOptional, IsString } from 'class-validator';

export class OverrideTeamsDto {
  @IsOptional()
  @IsString()
  team1Id?: string | null;

  @IsOptional()
  @IsString()
  team2Id?: string | null;
}
