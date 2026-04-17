import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { MessageKind } from '@prisma/client';
import { InlineKeyboardDto } from './inline-keyboard.dto';

export class UpdateMessageDto {
  @IsOptional()
  @IsEnum(MessageKind)
  kind?: MessageKind;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  content?: string;

  @IsOptional()
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

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;
}
