import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MessageKind, Prisma, Template } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { InlineKeyboardDto } from '../messages/dto/inline-keyboard.dto';

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
      throw new BadRequestException('content is required for TEXT templates');
    }
  } else if (kind === MessageKind.PHOTO) {
    if (!mediaUrl) {
      throw new BadRequestException('mediaUrl is required for PHOTO templates');
    }
  }
}

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<Template[]> {
    return this.prisma.template.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string): Promise<Template> {
    const template = await this.prisma.template.findUnique({ where: { id } });
    if (!template) throw new NotFoundException(`Template ${id} not found`);
    return template;
  }

  async create(dto: CreateTemplateDto): Promise<Template> {
    assertKindInvariants(dto.kind, dto.content, dto.mediaUrl);
    const buttons = flattenButtons(dto.buttons);
    try {
      return await this.prisma.template.create({
        data: {
          name: dto.name,
          kind: dto.kind,
          content: dto.kind === MessageKind.PHOTO ? (dto.content ?? '') : dto.content!,
          mediaUrl: dto.kind === MessageKind.PHOTO ? dto.mediaUrl : null,
          disableWebPagePreview:
            dto.kind === MessageKind.TEXT ? !!dto.disableWebPagePreview : false,
          buttons: buttons ?? Prisma.DbNull,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          `A template with name "${dto.name}" already exists`,
        );
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateTemplateDto): Promise<Template> {
    const existing = await this.findOne(id);
    const nextKind = dto.kind ?? existing.kind;
    const nextContent = dto.content !== undefined ? dto.content : existing.content;
    const nextMediaUrl =
      dto.mediaUrl !== undefined ? dto.mediaUrl : existing.mediaUrl ?? undefined;
    if (dto.kind !== undefined || dto.content !== undefined || dto.mediaUrl !== undefined) {
      assertKindInvariants(nextKind, nextContent, nextMediaUrl ?? undefined);
    }
    const data: Prisma.TemplateUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.kind !== undefined) data.kind = dto.kind;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.mediaUrl !== undefined) data.mediaUrl = dto.mediaUrl || null;
    if (dto.disableWebPagePreview !== undefined) {
      data.disableWebPagePreview = dto.disableWebPagePreview;
    }
    if (dto.buttons !== undefined) {
      data.buttons = flattenButtons(dto.buttons) ?? Prisma.DbNull;
    }
    try {
      return await this.prisma.template.update({ where: { id }, data });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          `A template with name "${dto.name}" already exists`,
        );
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.template.delete({ where: { id } });
  }
}
