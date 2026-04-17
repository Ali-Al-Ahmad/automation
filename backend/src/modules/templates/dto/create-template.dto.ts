import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { MessageKind } from '@prisma/client';
import { InlineKeyboardDto } from '../../messages/dto/inline-keyboard.dto';

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsEnum(MessageKind)
  kind!: MessageKind;

  @ValidateIf((o) => o.kind === MessageKind.TEXT)
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  @ValidateIf((o) => o.kind === MessageKind.PHOTO && o.content !== undefined && o.content !== '')
  @IsString()
  @MaxLength(1024)
  content?: string;

  @ValidateIf((o) => o.kind === MessageKind.PHOTO)
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  mediaUrl?: string;

  @IsOptional()
  @IsBoolean()
  disableWebPagePreview?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => InlineKeyboardDto)
  buttons?: InlineKeyboardDto;
}
