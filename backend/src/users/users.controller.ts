import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service.js';
import { PredictionsService } from '../predictions/predictions.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateStatusDto } from './dto/update-status.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import { User } from './schemas/user.schema.js';

@Controller('api/users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private predictionsService: PredictionsService,
  ) {}

  @Get('me')
  async getProfile(@CurrentUser() user: User) {
    const profile = await this.usersService.findById(user._id.toString());
    if (!profile) return null;
    const { password, ...result } = profile.toObject();
    return result;
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(
      user._id.toString(),
      updateUserDto,
    );
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /image\/(jpeg|png|webp)/, skipMagicNumbersValidation: true }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.usersService.updateProfilePicture(
      user._id.toString(),
      file.filename,
    );
  }

  @Get()
  @Roles(Role.Admin)
  async findAll() {
    const players = await this.usersService.findAllPlayers();
    const progressMap = await this.predictionsService.getAllProgress();
    return players.map((p) => {
      const obj = p.toObject ? p.toObject() : p;
      const progress = progressMap[obj._id.toString()] || {
        filled: 0,
        total: 0,
        percentage: 0,
      };
      return { ...obj, progress };
    });
  }

  @Patch(':id/status')
  @Roles(Role.Admin)
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.usersService.updateStatus(id, updateStatusDto.status);
  }

  @Patch(':id/reset-password')
  @Roles(Role.Admin)
  async resetPassword(
    @Param('id') id: string,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);
    await this.usersService.updatePassword(id, hashedPassword);
    return { message: 'Password reset successfully' };
  }
}
