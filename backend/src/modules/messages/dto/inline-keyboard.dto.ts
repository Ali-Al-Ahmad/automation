import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class InlineButtonDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  text!: string;

  @IsUrl({ require_protocol: true, protocols: ['http', 'https', 'tg'] })
  @MaxLength(2048)
  url!: string;
}

export class InlineRowDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => InlineButtonDto)
  buttons!: InlineButtonDto[];
}

export class InlineKeyboardDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => InlineRowDto)
  rows!: InlineRowDto[];
}
