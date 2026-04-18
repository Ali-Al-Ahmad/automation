'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ButtonsEditor } from '@/components/messages/buttons-editor';
import {
  bodySchema,
  type MessageFormValues,
} from '@/components/messages/message-form-schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import type { CreateTemplateInput } from '@/types/template';

const templateSchema = bodySchema
  .extend({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Max 100 chars'),
  })
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

export type TemplateFormValues = z.infer<typeof templateSchema>;

interface TemplateFormProps {
  defaultValues?: Partial<TemplateFormValues>;
  submitLabel: string;
  onSubmit: (values: CreateTemplateInput) => unknown | Promise<unknown>;
  isSubmitting?: boolean;
}

const DEFAULTS: TemplateFormValues = {
  name: '',
  kind: 'TEXT',
  content: '',
  mediaUrl: '',
  buttons: undefined,
};

export function TemplateForm({
  defaultValues,
  submitLabel,
  onSubmit,
  isSubmitting,
}: TemplateFormProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: { ...DEFAULTS, ...defaultValues },
  });

  const kind = watch('kind');

  const submit = handleSubmit(async (values) => {
    const payload: CreateTemplateInput = {
      name: values.name.trim(),
      kind: values.kind,
    };
    if (values.kind === 'TEXT') {
      payload.content = values.content!.trim();
    } else {
      payload.mediaUrl = values.mediaUrl!.trim();
      const caption = values.content?.trim();
      if (caption) payload.content = caption;
    }
    if (values.buttons && values.buttons.rows.length > 0) {
      payload.buttons = {
        rows: values.buttons.rows.map((r) => ({
          buttons: r.buttons.map((b) => ({
            text: b.text.trim(),
            url: b.url.trim(),
          })),
        })),
      };
    }
    await onSubmit(payload);
    if (!defaultValues) reset(DEFAULTS);
  });

  // ButtonsEditor expects MessageFormValues errors — compatible since
  // template schema extends the same body shape.
  const buttonsErrors = errors as unknown as import('react-hook-form').FieldErrors<MessageFormValues>;

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder="e.g. Daily reminder"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Message kind</Label>
        <Controller
          name="kind"
          control={control}
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              className="grid-cols-2 sm:grid-flow-col sm:auto-cols-fr"
            >
              <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm hover:bg-accent">
                <RadioGroupItem value="TEXT" /> Text
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm hover:bg-accent">
                <RadioGroupItem value="PHOTO" /> Photo (URL)
              </label>
            </RadioGroup>
          )}
        />
      </div>

      {kind === 'PHOTO' && (
        <div className="space-y-2">
          <Label htmlFor="mediaUrl">Photo URL</Label>
          <Input
            id="mediaUrl"
            placeholder="https://example.com/image.png"
            {...register('mediaUrl')}
          />
          {errors.mediaUrl && (
            <p className="text-xs text-destructive">{errors.mediaUrl.message}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="content">
          {kind === 'PHOTO' ? 'Caption (optional)' : 'Content'}
        </Label>
        <Textarea
          id="content"
          rows={5}
          placeholder={
            kind === 'PHOTO' ? 'Optional caption under the photo…' : 'Template body…'
          }
          {...register('content')}
        />
        {errors.content && (
          <p className="text-xs text-destructive">{errors.content.message}</p>
        )}
      </div>

      <ButtonsEditor
        control={control as unknown as import('react-hook-form').Control<MessageFormValues>}
        register={register as unknown as import('react-hook-form').UseFormRegister<MessageFormValues>}
        errors={buttonsErrors}
      />

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
