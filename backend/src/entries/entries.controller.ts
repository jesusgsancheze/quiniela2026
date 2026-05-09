import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { EntriesService } from './entries.service.js';
import { ReportEntryPaymentDto } from './dto/report-entry-payment.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import { User } from '../users/schemas/user.schema.js';

@Controller('api/entries')
export class EntriesController {
  constructor(private entriesService: EntriesService) {}

  @Get('me')
  findMine(@CurrentUser() user: User) {
    return this.entriesService.findByUser(user._id.toString());
  }

  @Get('me/active')
  findActive(@CurrentUser() user: User) {
    return this.entriesService.findActiveEntry(user._id.toString());
  }

  @Post('new')
  async createNew(@CurrentUser() user: User) {
    if (user.status !== 'active' && user.role !== 'admin') {
      throw new ForbiddenException('Account is not active');
    }
    return this.entriesService.createNewEntry(user._id.toString());
  }

  @Patch('me/report')
  reportPayment(
    @CurrentUser() user: User,
    @Body() dto: ReportEntryPaymentDto,
  ) {
    return this.entriesService.reportPaymentForActiveEntry(
      user._id.toString(),
      dto.note,
    );
  }

  @Get()
  @Roles(Role.Admin)
  findAll() {
    return this.entriesService.listAll();
  }

  @Patch(':id/confirm')
  @Roles(Role.Admin)
  confirm(@Param('id') id: string) {
    return this.entriesService.confirmEntryPayment(id);
  }

  @Patch(':id/reject')
  @Roles(Role.Admin)
  reject(@Param('id') id: string) {
    return this.entriesService.rejectEntryPayment(id);
  }
}
