export const MessageStatusValues = ['PENDING', 'SENDING', 'SENT', 'FAILED'] as const;
export type MessageStatus = (typeof MessageStatusValues)[number];

export const MessageKindValues = ['TEXT', 'PHOTO'] as const;
export type MessageKind = (typeof MessageKindValues)[number];

export interface InlineButton {
  text: string;
  url: string;
}

export interface InlineKeyboard {
  rows: InlineButton[][];
}

export interface InlineKeyboardInput {
  rows: Array<{ buttons: InlineButton[] }>;
}

export interface Message {
  id: string;
  kind: MessageKind;
  content: string;
  mediaUrl: string | null;
  disableWebPagePreview: boolean;
  buttons: InlineKeyboard | null;
  scheduledAt: string;
  status: MessageStatus;
  retryCount: number;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageList {
  items: Message[];
  total: number;
}

export interface CreateMessageInput {
  kind: MessageKind;
  content?: string;
  mediaUrl?: string;
  disableWebPagePreview?: boolean;
  buttons?: InlineKeyboardInput;
  scheduledAt: string;
  templateId?: string;
}

export interface UpdateMessageInput {
  kind?: MessageKind;
  content?: string;
  mediaUrl?: string;
  disableWebPagePreview?: boolean;
  buttons?: InlineKeyboardInput;
  scheduledAt?: string;
}
