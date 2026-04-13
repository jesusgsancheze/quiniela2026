import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
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
}
