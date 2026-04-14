import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD } from '@nestjs/core';
import { join, resolve } from 'path';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { TeamsModule } from './teams/teams.module.js';
import { GroupsModule } from './groups/groups.module.js';
import { MatchesModule } from './matches/matches.module.js';
import { PredictionsModule } from './predictions/predictions.module.js';
import { LeaderboardModule } from './leaderboard/leaderboard.module.js';
import { SeederModule } from './seeder/seeder.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { MailModule } from './mail/mail.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(process.cwd(), '.env'),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    AuthModule,
    UsersModule,
    TeamsModule,
    GroupsModule,
    MatchesModule,
    PredictionsModule,
    LeaderboardModule,
    SeederModule,
    PaymentsModule,
    MailModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
