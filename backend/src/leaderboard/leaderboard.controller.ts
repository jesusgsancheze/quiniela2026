import { Controller, Get, Param } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service.js';

@Controller('api/leaderboard')
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  @Get()
  getRankings() {
    return this.leaderboardService.getRankings();
  }

  @Get('entries/:id/predictions')
  getEntryPredictions(@Param('id') id: string) {
    return this.leaderboardService.getEntryPredictions(id);
  }
}
