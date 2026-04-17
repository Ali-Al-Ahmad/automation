import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { MessagesModule } from './modules/messages/messages.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { TemplatesModule } from './modules/templates/templates.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    PrismaModule,
    TelegramModule,
    MessagesModule,
    TemplatesModule,
    SchedulerModule,
  ],
})
export class AppModule {}
