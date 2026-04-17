import type {
  CreateMessageInput,
  Message,
  MessageList,
  MessageStatus,
  UpdateMessageInput,
} from '@/types/message';
import { apiFetch } from '../api-client';

export const messagesApi = {
  list: (params: { status?: MessageStatus; skip?: number; take?: number } = {}) =>
    apiFetch<MessageList>('/messages', { query: params }),

  get: (id: string) => apiFetch<Message>(`/messages/${id}`),

  create: (input: CreateMessageInput) =>
    apiFetch<Message>('/messages', { method: 'POST', body: input }),

  update: (id: string, input: UpdateMessageInput) =>
    apiFetch<Message>(`/messages/${id}`, { method: 'PATCH', body: input }),

  remove: (id: string) =>
    apiFetch<void>(`/messages/${id}`, { method: 'DELETE' }),
};
