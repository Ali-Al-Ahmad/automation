import type { InlineKeyboard, MessageKind } from './message';

export interface Template {
  id: string;
  name: string;
  kind: MessageKind;
  content: string;
  mediaUrl: string | null;
  disableWebPagePreview: boolean;
  buttons: InlineKeyboard | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  name: string;
  kind: MessageKind;
  content?: string;
  mediaUrl?: string;
  disableWebPagePreview?: boolean;
  buttons?: InlineKeyboard;
}

export interface UpdateTemplateInput {
  name?: string;
  kind?: MessageKind;
  content?: string;
  mediaUrl?: string;
  disableWebPagePreview?: boolean;
  buttons?: InlineKeyboard;
}
