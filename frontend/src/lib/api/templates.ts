import type {
  CreateTemplateInput,
  Template,
  UpdateTemplateInput,
} from '@/types/template';
import { apiFetch } from '../api-client';

export const templatesApi = {
  list: () => apiFetch<Template[]>('/templates'),
  get: (id: string) => apiFetch<Template>(`/templates/${id}`),
  create: (input: CreateTemplateInput) =>
    apiFetch<Template>('/templates', { method: 'POST', body: input }),
  update: (id: string, input: UpdateTemplateInput) =>
    apiFetch<Template>(`/templates/${id}`, { method: 'PATCH', body: input }),
  remove: (id: string) =>
    apiFetch<void>(`/templates/${id}`, { method: 'DELETE' }),
};
