import { Controller, Get } from '@nestjs/common';
import { GroupsService } from './groups.service.js';

@Controller('api/groups')
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @Get()
  findAll() {
    return this.groupsService.findAll();
  }

  @Get('standings')
  getStandings() {
    return this.groupsService.getStandings();
  }
}
