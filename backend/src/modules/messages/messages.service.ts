import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Message, MessageKind, MessageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { InlineKeyboardDto } from './dto/inline-keyboard.dto';
import { ListMessagesQuery } from './dto/list-messages.query';
import { UpdateMessageDto } from './dto/update-message.dto';

function flattenButtons(
  buttons: InlineKeyboardDto | undefined,
): Prisma.InputJsonValue | undefined {
  if (!buttons) return undefined;
  return {
    rows: buttons.rows.map((r) => r.buttons.map((b) => ({ text: b.text, url: b.url }))),
  };
}

function assertKindInvariants(
  kind: MessageKind,
  content: string | undefined,
  mediaUrl: string | undefined,
): void {
  if (kind === MessageKind.TEXT) {
    if (!content || content.length === 0) {
      throw new BadRequestException('content is required for TEXT messages');
    }
  } else if (kind === MessageKind.PHOTO) {
    if (!mediaUrl) {
      throw new BadRequestException('mediaUrl is required for PHOTO messages');
    }
  }
}

const MAX_RETRIES = 3;
const RETRY_BACKOFF_MINUTES = [1, 5, 15];
const STUCK_SENDING_THRESHOLD_MS = 5 * 60 * 1000;

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: ListMessagesQuery,
  ): Promise<{ items: Message[]; total: number }> {
    const { status, skip = 0, take = 50 } = query;
    const where: Prisma.MessageWhereInput = status ? { status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.message.findMany({
        where,
        orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.message.count({ where }),
    ]);
    return { items, total };
  }

  async findOne(id: string): Promise<Message> {
    const message = await this.prisma.message.findUnique({ where: { id } });
    if (!message) throw new NotFoundException(`Message ${id} not found`);
    return message;
  }

  async create(dto: CreateMessageDto): Promise<Message> {
    if (dto.templateId) {
      const template = await this.prisma.template.findUnique({
        where: { id: dto.templateId },
      });
      if (!template) {
        throw new BadRequestException(`Template ${dto.templateId} not found`);
      }
    }
    assertKindInvariants(dto.kind, dto.content, dto.mediaUrl);
    const buttons = flattenButtons(dto.buttons);
    return this.prisma.message.create({
      data: {
        kind: dto.kind,
        content: dto.kind === MessageKind.PHOTO ? (dto.content ?? '') : dto.content!,
        mediaUrl: dto.kind === MessageKind.PHOTO ? dto.mediaUrl : null,
        disableWebPagePreview:
          dto.kind === MessageKind.TEXT ? !!dto.disableWebPagePreview : false,
        buttons: buttons ?? Prisma.DbNull,
        scheduledAt: new Date(dto.scheduledAt),
      },
    });
  }

  async update(id: string, dto: UpdateMessageDto): Promise<Message> {
    const existing = await this.findOne(id);
    if (existing.status !== MessageStatus.PENDING) {
      throw new BadRequestException(
        `Cannot edit a message with status ${existing.status}`,
      );
    }
    const nextKind = dto.kind ?? existing.kind;
    const nextContent = dto.content !== undefined ? dto.content : existing.content;
    const nextMediaUrl =
      dto.mediaUrl !== undefined ? dto.mediaUrl : existing.mediaUrl ?? undefined;
    if (dto.kind !== undefined || dto.content !== undefined || dto.mediaUrl !== undefined) {
      assertKindInvariants(nextKind, nextContent, nextMediaUrl ?? undefined);
    }
    const data: Prisma.MessageUpdateInput = {};
    if (dto.kind !== undefined) data.kind = dto.kind;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.mediaUrl !== undefined) data.mediaUrl = dto.mediaUrl || null;
    if (dto.disableWebPagePreview !== undefined) {
      data.disableWebPagePreview = dto.disableWebPagePreview;
    }
    if (dto.buttons !== undefined) {
      data.buttons = flattenButtons(dto.buttons) ?? Prisma.DbNull;
    }
    if (dto.scheduledAt !== undefined) data.scheduledAt = new Date(dto.scheduledAt);
    return this.prisma.message.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.message.delete({ where: { id } });
  }

  /**
   * Atomically claim due messages by flipping PENDING → SENDING with
   * SELECT ... FOR UPDATE SKIP LOCKED. Safe across concurrent cron ticks
   * and multiple app instances. Returns the claimed rows so the caller
   * can dispatch them.
   */
  async claimDueMessages(limit = 20): Promise<Message[]> {
    return this.prisma.$queryRaw<Message[]>`
      UPDATE "Message"
      SET "status" = 'SENDING'::"MessageStatus", "updatedAt" = NOW()
      WHERE "id" IN (
        SELECT "id" FROM "Message"
        WHERE "status" = 'PENDING'::"MessageStatus"
          AND "scheduledAt" <= NOW()
        ORDER BY "scheduledAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
      )
      RETURNING *;
    `;
  }

  /**
   * Rescue messages stuck in SENDING (e.g. process crashed mid-dispatch).
   * Bumps them back to PENDING without touching retryCount — the send
   * didn't complete, so a retry is the correct behavior.
   */
  async reapStuckSending(): Promise<number> {
    const cutoff = new Date(Date.now() - STUCK_SENDING_THRESHOLD_MS);
    const { count } = await this.prisma.message.updateMany({
      where: { status: MessageStatus.SENDING, updatedAt: { lt: cutoff } },
      data: { status: MessageStatus.PENDING },
    });
    return count;
  }

  async markSent(id: string): Promise<void> {
    await this.prisma.message.update({
      where: { id },
      data: {
        status: MessageStatus.SENT,
        sentAt: new Date(),
        lastError: null,
      },
    });
  }

  /**
   * Applies retry policy: up to MAX_RETRIES attempts with exponential
   * backoff, then permanently FAILED. Called with the current message
   * state; reads retryCount to decide.
   */
  async markFailed(id: string, error: unknown): Promise<void> {
    const message = await this.prisma.message.findUnique({ where: { id } });
    if (!message) return;

    const errorText = this.serializeError(error);
    const nextCount = message.retryCount + 1;

    if (nextCount < MAX_RETRIES) {
      const backoffMin = RETRY_BACKOFF_MINUTES[nextCount - 1] ?? 15;
      const nextScheduledAt = new Date(Date.now() + backoffMin * 60 * 1000);
      await this.prisma.message.update({
        where: { id },
        data: {
          status: MessageStatus.PENDING,
          retryCount: nextCount,
          lastError: errorText,
          scheduledAt: nextScheduledAt,
        },
      });
      return;
    }

    await this.prisma.message.update({
      where: { id },
      data: {
        status: MessageStatus.FAILED,
        retryCount: nextCount,
        lastError: errorText,
      },
    });
  }

  private serializeError(error: unknown): string {
    if (error instanceof Error) return `${error.name}: ${error.message}`;
    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }
}
