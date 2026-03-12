import { Module } from '@nestjs/common';
import { BotModule } from '../bot/bot.module';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';

@Module({
  imports: [BotModule],
  controllers: [GoalsController],
  providers: [GoalsService],
})
export class GoalsModule {}
