import {
  Controller,
  Get,
  Put,
  Body,
  ForbiddenException,
  Param,
  Query,
} from '@nestjs/common';
import { PredictionsService } from './predictions.service.js';
import { UpsertPredictionDto } from './dto/upsert-prediction.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import { User } from '../users/schemas/user.schema.js';

@Controller('api/predictions')
export class PredictionsController {
  constructor(private predictionsService: PredictionsService) {}

  @Get('me')
  findMyPredictions(
    @CurrentUser() user: User,
    @Query('filled') filled?: string,
    @Query('entryId') entryId?: string,
  ) {
    if (user.status !== 'active' && user.role !== 'admin') {
      throw new ForbiddenException('Account is not active');
    }
    return this.predictionsService.findByUser(
      user._id.toString(),
      filled,
      entryId,
    );
  }

  @Put()
  upsert(
    @CurrentUser() user: User,
    @Body() dto: UpsertPredictionDto,
  ) {
    if (user.status !== 'active' && user.role !== 'admin') {
      throw new ForbiddenException('Account is not active');
    }
    return this.predictionsService.upsert(
      user._id.toString(),
      dto.matchId,
      dto.score1,
      dto.score2,
      dto.entryId,
    );
  }

  @Get('progress')
  getProgress(
    @CurrentUser() user: User,
    @Query('entryId') entryId?: string,
  ) {
    if (user.status !== 'active' && user.role !== 'admin') {
      throw new ForbiddenException('Account is not active');
    }
    return this.predictionsService.getProgress(user._id.toString(), entryId);
  }

  @Get('progress/all')
  @Roles(Role.Admin)
  getAllProgress() {
    return this.predictionsService.getAllProgress();
  }

  @Get('match/:matchId')
  getPredictionsForMatch(@Param('matchId') matchId: string) {
    return this.predictionsService.getPublicPredictionsForMatch(matchId);
  }
}
