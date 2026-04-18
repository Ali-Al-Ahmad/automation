import { z } from 'zod';

const buttonSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Button text required')
    .max(64, 'Max 64 chars'),
  url: z
    .string()
    .trim()
    .min(1, 'Button URL required')
    .max(2048, 'URL too long')
    .refine((v) => /^https?:\/\//i.test(v) || /^tg:\/\//i.test(v), {
      message: 'Must be http(s):// or tg:// URL',
    }),
});

const rowSchema = z.object({
  buttons: z.array(buttonSchema).min(1).max(8),
});

const rawButtonsSchema = z
  .object({ rows: z.array(rowSchema).min(1).max(8) })
  .optional();

/**
 * Buttons are fully optional. Empty rows and fully-empty buttons
 * are dropped before validation so the user can add a row, change
 * their mind, and still submit without having to remove it.
 */
export const buttonsSchema = z.preprocess((val) => {
  if (!val || typeof val !== 'object') return undefined;
  const v = val as {
    rows?: Array<{ buttons?: Array<{ text?: string; url?: string }> }>;
  };
  if (!Array.isArray(v.rows)) return undefined;
  const cleanedRows = v.rows
    .map((r) => ({
      buttons: (r.buttons ?? []).filter(
        (b) => (b?.text ?? '').trim() !== '' || (b?.url ?? '').trim() !== '',
      ),
    }))
    .filter((r) => r.buttons.length > 0);
  return cleanedRows.length > 0 ? { rows: cleanedRows } : undefined;
}, rawButtonsSchema);

export const bodySchema = z.object({
  kind: z.enum(['TEXT', 'PHOTO']),
  content: z.string().trim().max(4096).optional().default(''),
  mediaUrl: z.string().trim().optional().default(''),
  buttons: buttonsSchema,
});

export const messageFormSchema = bodySchema
  .extend({ scheduledAtLocal: z.string().optional().default('') })
  .superRefine((v, ctx) => {
    if (v.kind === 'TEXT') {
      if (!v.content) {
        ctx.addIssue({
          path: ['content'],
          code: 'custom',
          message: 'Content is required',
        });
      }
    } else {
      if (!v.mediaUrl) {
        ctx.addIssue({
          path: ['mediaUrl'],
          code: 'custom',
          message: 'Photo URL required',
        });
      } else if (!/^https?:\/\//i.test(v.mediaUrl)) {
        ctx.addIssue({
          path: ['mediaUrl'],
          code: 'custom',
          message: 'Must be an http(s) URL',
        });
      }
      if (v.content && v.content.length > 1024) {
        ctx.addIssue({
          path: ['content'],
          code: 'custom',
          message: 'Captions max 1024 chars',
        });
      }
    }
  });

export type MessageFormValues = z.infer<typeof messageFormSchema>;
