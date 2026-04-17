import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Message } from '@prisma/client';
import type { Env } from '../../config/env.validation';

type TelegramApiResponse = {
  ok: boolean;
  description?: string;
  error_code?: number;
};

export type SendableMessage = Pick<
  Message,
  'kind' | 'content' | 'mediaUrl' | 'disableWebPagePreview' | 'buttons'
>;

type StoredButtons = { rows: Array<Array<{ text: string; url: string }>> };

function toInlineKeyboard(buttons: unknown) {
  const b = buttons as StoredButtons | null;
  if (!b || !Array.isArray(b.rows) || b.rows.length === 0) return undefined;
  return { inline_keyboard: b.rows };
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string;
  private readonly chatId: string;

  constructor(config: ConfigService<Env, true>) {
    this.botToken = config.get('TELEGRAM_BOT_TOKEN', { infer: true });
    this.chatId = config.get('TELEGRAM_CHAT_ID', { infer: true });
  }

  async send(message: SendableMessage): Promise<void> {
    if (message.kind === 'PHOTO') {
      const replyMarkup = toInlineKeyboard(message.buttons);
      await this.callApi('sendPhoto', {
        chat_id: this.chatId,
        photo: message.mediaUrl,
        ...(message.content && { caption: message.content }),
        ...(replyMarkup && { reply_markup: replyMarkup }),
      });
      this.logger.debug(`Telegram photo delivered (${message.mediaUrl})`);
      return;
    }

    const replyMarkup = toInlineKeyboard(message.buttons);
    await this.callApi('sendMessage', {
      chat_id: this.chatId,
      text: message.content,
      ...(message.disableWebPagePreview && { disable_web_page_preview: true }),
      ...(replyMarkup && { reply_markup: replyMarkup }),
    });
    this.logger.debug(
      `Telegram text delivered (${message.content.length} chars)`,
    );
  }

  private async callApi(method: string, payload: unknown): Promise<void> {
    const url = `https://api.telegram.org/bot${this.botToken}/${method}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const body = (await res.json().catch(() => ({}))) as TelegramApiResponse;

    if (!res.ok || !body.ok) {
      const detail = body.description ?? `HTTP ${res.status}`;
      throw new Error(`Telegram ${method} failed: ${detail}`);
    }
  }
}
