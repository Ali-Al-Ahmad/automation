import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MessagesService } from '../messages/messages.service';
import { TelegramService } from '../telegram/telegram.service';

const DISPATCH_BATCH_SIZE = 20;

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private isRunning = false;

  constructor(
    private readonly messages: MessagesService,
    private readonly telegram: TelegramService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    if (this.isRunning) {
      this.logger.debug('Previous tick still running; skipping');
      return;
    }

    this.isRunning = true;
    try {
      const reaped = await this.messages.reapStuckSending();
      if (reaped > 0) {
        this.logger.warn(`Reaped ${reaped} stuck SENDING message(s) back to PENDING`);
      }

      const claimed = await this.messages.claimDueMessages(DISPATCH_BATCH_SIZE);
      if (claimed.length === 0) return;

      this.logger.log(`Dispatching ${claimed.length} due message(s)`);
      for (const message of claimed) {
        try {
          await this.telegram.send(message);
          await this.messages.markSent(message.id);
        } catch (error) {
          this.logger.error(
            `Failed to send message ${message.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          await this.messages.markFailed(message.id, error);
        }
      }
    } catch (error) {
      this.logger.error(
        'Scheduler tick failed',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.isRunning = false;
    }
  }
}
