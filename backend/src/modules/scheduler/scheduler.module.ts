import { Module } from '@nestjs/common';
import { MessagesModule } from '../messages/messages.module';
import { TelegramModule } from '../telegram/telegram.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [MessagesModule, TelegramModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
