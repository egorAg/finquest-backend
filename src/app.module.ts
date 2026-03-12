import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SpacesModule } from './spaces/spaces.module';
import { TransactionsModule } from './transactions/transactions.module';
import { GoalsModule } from './goals/goals.module';
import { ChallengesModule } from './challenges/challenges.module';
import { AchievementsModule } from './achievements/achievements.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { XpModule } from './xp/xp.module';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    XpModule,
    AuthModule,
    UsersModule,
    SpacesModule,
    TransactionsModule,
    GoalsModule,
    ChallengesModule,
    AchievementsModule,
    LeaderboardModule,
    NotificationsModule,
    AnalyticsModule,
    KnowledgeModule,
  ],
})
export class AppModule {}
