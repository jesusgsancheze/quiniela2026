import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
} from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { UpdatePaymentConfigDto } from './dto/update-payment-config.dto.js';
import { ReportPaymentDto } from './dto/report-payment.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/schemas/user.schema.js';

@Controller('api/payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('config')
  getConfig() {
    return this.paymentsService.getConfig();
  }

  @Put('config')
  @Roles(Role.Admin)
  upsertConfig(@Body() dto: UpdatePaymentConfigDto) {
    return this.paymentsService.upsertConfig(dto);
  }

  @Patch('report')
  reportPayment(
    @CurrentUser() user: User,
    @Body() dto: ReportPaymentDto,
  ) {
    return this.paymentsService.reportPayment(
      user._id.toString(),
      dto.note,
    );
  }

  @Patch(':userId/confirm')
  @Roles(Role.Admin)
  confirmPayment(
    @Param('userId') userId: string,
    @Query('entryId') entryId?: string,
  ) {
    return this.paymentsService.confirmPayment(userId, entryId);
  }

  @Patch(':userId/reject')
  @Roles(Role.Admin)
  rejectPayment(
    @Param('userId') userId: string,
    @Query('entryId') entryId?: string,
  ) {
    return this.paymentsService.rejectPayment(userId, entryId);
  }
}
