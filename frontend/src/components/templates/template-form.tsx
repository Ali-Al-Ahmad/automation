'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name is too long (max 100 chars)'),
  content: z
    .string()
    .trim()
    .min(1, 'Content is required')
    .max(4096, 'Content is too long (max 4096 chars)'),
});

export type TemplateFormValues = z.infer<typeof schema>;

interface TemplateFormProps {
  defaultValues?: Partial<TemplateFormValues>;
  submitLabel: string;
  onSubmit: (values: TemplateFormValues) => unknown | Promise<unknown>;
  isSubmitting?: boolean;
}

export function TemplateForm({
  defaultValues,
  submitLabel,
  onSubmit,
  isSubmitting,
}: TemplateFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      content: defaultValues?.content ?? '',
    },
  });

  const submit = handleSubmit(async (values) => {
    await onSubmit({ name: values.name.trim(), content: values.content.trim() });
    if (!defaultValues) reset({ name: '', content: '' });
  });

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
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          rows={5}
          placeholder="Template body…"
          {...register('content')}
        />
        {errors.content && (
          <p className="text-xs text-destructive">{errors.content.message}</p>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
