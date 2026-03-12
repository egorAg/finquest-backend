import { Module } from '@nestjs/common';
import { BotModule } from '../bot/bot.module';
import { RecurringController } from './recurring.controller';
import { RecurringService } from './recurring.service';

@Module({
  imports: [BotModule],
  controllers: [RecurringController],
  providers: [RecurringService],
})
export class RecurringModule {}
