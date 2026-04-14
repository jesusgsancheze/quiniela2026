import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);
  private readonly fromEmail: string;
  private readonly frontendUrl: string;

  constructor(private configService: ConfigService) {
    this.fromEmail = this.configService.get<string>(
      'SMTP_FROM',
      'noreply@quiniela2026.com',
    );
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );

    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (!smtpUser || !smtpPass) {
      this.logger.warn(
        'SMTP_USER or SMTP_PASS not configured. Emails will not be sent.',
      );
    }

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: false,
      ...(smtpUser && smtpPass
        ? {
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          }
        : {}),
    });
  }

  async sendVerificationEmail(
    email: string,
    firstName: string,
    token: string,
  ): Promise<void> {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: `"Quiniela 2026" <${this.fromEmail}>`,
        to: email,
        subject: 'Verify your email - Quiniela 2026',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #1B2A4A; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #C9A84C; margin: 0;">Quiniela 2026</h1>
              <p style="color: #fff; margin: 5px 0 0;">FIFA World Cup</p>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1B2A4A;">Hello, ${firstName}!</h2>
              <p style="color: #555;">Thank you for registering. Please verify your email address by clicking the button below:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verifyUrl}" style="background: #C9A84C; color: #1B2A4A; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Verify Email
                </a>
              </div>
              <p style="color: #888; font-size: 12px;">If you didn't create an account, you can ignore this email.</p>
              <p style="color: #888; font-size: 12px;">Or copy this link: ${verifyUrl}</p>
            </div>
          </div>
        `,
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
    }
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    token: string,
  ): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: `"Quiniela 2026" <${this.fromEmail}>`,
        to: email,
        subject: 'Reset your password - Quiniela 2026',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #1B2A4A; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #C9A84C; margin: 0;">Quiniela 2026</h1>
              <p style="color: #fff; margin: 5px 0 0;">FIFA World Cup</p>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1B2A4A;">Hello, ${firstName}!</h2>
              <p style="color: #555;">You requested a password reset. Click the button below to set a new password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background: #8C1D40; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Reset Password
                </a>
              </div>
              <p style="color: #888; font-size: 12px;">This link expires in 1 hour.</p>
              <p style="color: #888; font-size: 12px;">If you didn't request this, you can ignore this email.</p>
              <p style="color: #888; font-size: 12px;">Or copy this link: ${resetUrl}</p>
            </div>
          </div>
        `,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error,
      );
    }
  }
}
