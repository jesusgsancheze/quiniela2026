import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { MatchesService } from './matches.service.js';
import { UpdateResultDto } from './dto/update-result.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import { PredictionsService } from '../predictions/predictions.service.js';

@Controller('api/matches')
export class MatchesController {
  constructor(
    private matchesService: MatchesService,
    private predictionsService: PredictionsService,
  ) {}

  @Get()
  findAll(
    @Query('stage') stage?: string,
    @Query('group') group?: string,
    @Query('status') status?: string,
  ) {
    return this.matchesService.findAll({ stage, group, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.matchesService.findById(id);
  }

  @Patch(':id/result')
  @Roles(Role.Admin)
  async setResult(
    @Param('id') id: string,
    @Body() updateResultDto: UpdateResultDto,
  ) {
    const match = await this.matchesService.setResult(
      id,
      updateResultDto.score1,
      updateResultDto.score2,
    );
    await this.predictionsService.calculatePoints(
      match._id.toString(),
      updateResultDto.score1,
      updateResultDto.score2,
    );
    return match;
  }

  @Delete(':id/result')
  @Roles(Role.Admin)
  async clearResult(@Param('id') id: string) {
    await this.predictionsService.clearPoints(id);
    const match = await this.matchesService.clearResult(id);
    return match;
  }

  @Post('auto-fill')
  @Roles(Role.Admin)
  async autoFillResults() {
    const matches = await this.matchesService.findAll({ stage: 'group', status: 'scheduled' });
    let filled = 0;
    for (const match of matches) {
      const { score1, score2 } = this.generateRealisticScore();
      await this.matchesService.setResult(match._id.toString(), score1, score2);
      await this.predictionsService.calculatePoints(match._id.toString(), score1, score2);
      filled++;
    }
    return { message: `Auto-filled ${filled} matches`, filled };
  }

  @Delete('results/all')
  @Roles(Role.Admin)
  async clearAllResults() {
    const matches = await this.matchesService.findAll({ stage: 'group', status: 'finished' });
    let cleared = 0;
    for (const match of matches) {
      await this.predictionsService.clearPoints(match._id.toString());
      await this.matchesService.clearResult(match._id.toString());
      cleared++;
    }
    return { message: `Cleared ${cleared} results`, cleared };
  }

  private generateRealisticScore(): { score1: number; score2: number } {
    // Weighted distribution based on real World Cup data
    // ~25% draws, ~75% decisive results
    // Most goals between 0-3, rarely 4+
    const rand = Math.random();
    let score1: number;
    let score2: number;

    if (rand < 0.25) {
      // Draw
      const drawScores = [0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 3];
      const s = drawScores[Math.floor(Math.random() * drawScores.length)];
      score1 = s;
      score2 = s;
    } else {
      // Decisive result
      const goals = this.weightedGoal();
      const loserGoals = this.weightedLoserGoal(goals);
      if (Math.random() < 0.5) {
        score1 = goals;
        score2 = loserGoals;
      } else {
        score1 = loserGoals;
        score2 = goals;
      }
    }

    return { score1, score2 };
  }

  private weightedGoal(): number {
    // Winner goals: 1-4, weighted toward 1-2
    const r = Math.random();
    if (r < 0.35) return 1;
    if (r < 0.65) return 2;
    if (r < 0.85) return 3;
    if (r < 0.95) return 4;
    return 5;
  }

  private weightedLoserGoal(winnerGoals: number): number {
    // Loser scores 0 to winnerGoals-1, weighted toward 0-1
    const max = winnerGoals - 1;
    if (max <= 0) return 0;
    const r = Math.random();
    if (r < 0.45) return 0;
    if (r < 0.80) return 1;
    if (max >= 2 && r < 0.95) return 2;
    return Math.min(3, max);
  }
}
