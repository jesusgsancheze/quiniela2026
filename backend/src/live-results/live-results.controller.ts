import { Controller, Post } from '@nestjs/common';
import { LiveResultsService } from './live-results.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';

@Controller('api/live-results')
export class LiveResultsController {
  constructor(private readonly liveResults: LiveResultsService) {}

  /** Force an immediate sync against the provider, ignoring the time window. */
  @Post('sync')
  @Roles(Role.Admin)
  async sync() {
    const summary = await this.liveResults.sync(true);
    return summary;
  }
}
