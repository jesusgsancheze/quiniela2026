import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { KnockoutService } from './knockout.service.js';
import { KnockoutBracketService } from './knockout-bracket.service.js';
import { UpsertKnockoutPredictionDto } from './dto/upsert-knockout-prediction.dto.js';
import { ReportKnockoutPaymentDto } from './dto/report-knockout-payment.dto.js';
import { SetKnockoutResultDto } from './dto/set-knockout-result.dto.js';
import { OverrideTeamsDto } from './dto/override-teams.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import { User } from '../users/schemas/user.schema.js';

@Controller('api/knockout')
export class KnockoutController {
  constructor(
    private knockout: KnockoutService,
    private bracket: KnockoutBracketService,
  ) {}

  // --- Player: entries ---

  @Get('entries/me')
  myEntries(@CurrentUser() user: User) {
    return this.knockout.findEntriesByUser(user._id.toString());
  }

  @Post('entries/new')
  createEntry(@CurrentUser() user: User) {
    if (user.status !== 'active' && user.role !== 'admin') {
      throw new ForbiddenException('Account is not active');
    }
    return this.knockout.createNewEntry(user._id.toString());
  }

  @Patch('entries/me/report')
  reportPayment(@CurrentUser() user: User, @Body() dto: ReportKnockoutPaymentDto) {
    return this.knockout.reportPayment(user._id.toString(), dto.note);
  }

  // --- Player: bracket + predictions ---

  @Get('bracket')
  getBracket(@CurrentUser() user: User, @Query('entryId') entryId?: string) {
    return this.knockout.getBracket(user._id.toString(), entryId);
  }

  @Put('predictions')
  upsert(@CurrentUser() user: User, @Body() dto: UpsertKnockoutPredictionDto) {
    if (user.status !== 'active' && user.role !== 'admin') {
      throw new ForbiddenException('Account is not active');
    }
    return this.knockout.upsertPrediction(
      user._id.toString(),
      dto.matchId,
      dto.score1,
      dto.score2,
      dto.advances,
      dto.entryId,
    );
  }

  @Get('leaderboard')
  leaderboard() {
    return this.knockout.getRankings();
  }

  @Get('matches')
  publicMatches() {
    return this.knockout.getPublicMatches();
  }

  @Get('matches/:id/predictions')
  matchPredictions(@Param('id') id: string) {
    return this.knockout.getMatchPredictions(id);
  }

  @Get('entries/:id/predictions')
  entryPredictions(@Param('id') id: string) {
    return this.knockout.getEntryPredictionsDetail(id);
  }

  // --- Admin: entries ---

  @Get('entries')
  @Roles(Role.Admin)
  allEntries() {
    return this.knockout.listAllEntries();
  }

  @Patch('entries/:id/confirm')
  @Roles(Role.Admin)
  confirm(@Param('id') id: string) {
    return this.knockout.confirmPayment(id);
  }

  @Patch('entries/:id/reject')
  @Roles(Role.Admin)
  reject(@Param('id') id: string) {
    return this.knockout.rejectPayment(id);
  }

  // --- Admin: bracket management ---

  @Post('bracket/resolve-r32')
  @Roles(Role.Admin)
  async resolveR32() {
    const res = await this.bracket.resolveRound32();
    await this.bracket.progressBracket();
    await this.knockout.recalcAllPoints();
    return res;
  }

  @Post('bracket/progress')
  @Roles(Role.Admin)
  async progress() {
    const res = await this.bracket.progressBracket();
    await this.knockout.recalcAllPoints();
    return res;
  }

  @Patch('matches/:id/teams')
  @Roles(Role.Admin)
  async overrideTeams(@Param('id') id: string, @Body() dto: OverrideTeamsDto) {
    const match = await this.bracket.overrideTeams(id, dto.team1Id ?? null, dto.team2Id ?? null);
    await this.bracket.progressBracket();
    await this.knockout.recalcAllPoints();
    return match;
  }

  @Patch('matches/:id/result')
  @Roles(Role.Admin)
  async setResult(@Param('id') id: string, @Body() dto: SetKnockoutResultDto) {
    const match = await this.bracket.setResult(id, dto.score1, dto.score2, {
      decidedOnPenalties: dto.decidedOnPenalties,
      penaltyWinner: dto.penaltyWinner,
      live: dto.live,
    });
    await this.bracket.progressBracket();
    await this.knockout.recalcAllPoints();
    return match;
  }

  @Patch('matches/:id/clear')
  @Roles(Role.Admin)
  async clearResult(@Param('id') id: string) {
    const match = await this.bracket.clearResult(id);
    await this.bracket.progressBracket();
    await this.knockout.recalcAllPoints();
    return match;
  }

  @Post('recalc')
  @Roles(Role.Admin)
  recalc() {
    return this.knockout.recalcAllPoints();
  }
}
