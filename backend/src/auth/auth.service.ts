import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service.js';
import { MailService } from '../mail/mail.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { User } from '../users/schemas/user.schema.js';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existing = await this.usersService.findByEmail(registerDto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const verificationToken = uuidv4();

    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
      verificationToken,
      emailVerified: false,
    });

    await this.mailService.sendVerificationEmail(
      user.email,
      user.firstName,
      verificationToken,
    );

    return {
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    return this.buildTokenResponse(user);
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.verifyEmail(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }
    return { message: 'Email verified successfully. You can now log in.' };
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: 'If an account exists, a verification email has been sent.' };
    }
    if (user.emailVerified) {
      return { message: 'Email is already verified.' };
    }

    const verificationToken = uuidv4();
    await this.usersService.setVerificationToken(
      user._id.toString(),
      verificationToken,
    );

    await this.mailService.sendVerificationEmail(
      user.email,
      user.firstName,
      verificationToken,
    );

    return { message: 'If an account exists, a verification email has been sent.' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: 'If an account exists, a password reset email has been sent.' };
    }

    const resetToken = uuidv4();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.usersService.setResetToken(
      user._id.toString(),
      resetToken,
      expires,
    );

    await this.mailService.sendPasswordResetEmail(
      user.email,
      user.firstName,
      resetToken,
    );

    return { message: 'If an account exists, a password reset email has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByResetToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.resetPassword(
      user._id.toString(),
      hashedPassword,
    );

    return { message: 'Password reset successfully. You can now log in.' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      10,
    );
    await this.usersService.updatePassword(userId, hashedPassword);

    return { message: 'Password changed successfully' };
  }

  private buildTokenResponse(user: User) {
    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        profilePicture: user.profilePicture,
        paymentStatus: user.paymentStatus,
      },
    };
  }
}
