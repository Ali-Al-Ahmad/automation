'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { templatesApi } from '@/lib/api/templates';
import { formatUtc, toUtcIso } from '@/lib/format';

const schema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Content is required')
    .max(4096, 'Content is too long (max 4096 chars)'),
  scheduledAtLocal: z.string().min(1, 'Scheduled time is required'),
});

export type MessageFormValues = z.infer<typeof schema>;

export interface MessageFormSubmit {
  content: string;
  scheduledAt: string;
}

interface MessageFormProps {
  defaultValues?: Partial<MessageFormValues>;
  submitLabel: string;
  showTemplatePicker?: boolean;
  onSubmit: (values: MessageFormSubmit) => unknown | Promise<unknown>;
  isSubmitting?: boolean;
}

export function MessageForm({
  defaultValues,
  submitLabel,
  showTemplatePicker = true,
  onSubmit,
  isSubmitting,
}: MessageFormProps) {
  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MessageFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      content: defaultValues?.content ?? '',
      scheduledAtLocal: defaultValues?.scheduledAtLocal ?? '',
    },
  });

  const templatesQuery = useQuery({
    queryKey: ['templates'],
    queryFn: templatesApi.list,
    enabled: showTemplatePicker,
  });

  const scheduledAtLocal = watch('scheduledAtLocal');
  const utcPreview = scheduledAtLocal
    ? formatUtc(toUtcIso(scheduledAtLocal))
    : '';

  const submit = handleSubmit(async (values) => {
    const iso = toUtcIso(values.scheduledAtLocal);
    if (!iso) return;
    await onSubmit({ content: values.content.trim(), scheduledAt: iso });
  });

  return (
    <form onSubmit={submit} className="space-y-5">
      {showTemplatePicker && (
        <div className="space-y-2">
          <Label>Template (optional)</Label>
          <Controller
            name="content"
            control={control}
            render={() => (
              <Select
                onValueChange={(id) => {
                  const template = templatesQuery.data?.find(
                    (t) => t.id === id,
                  );
                  if (template) setValue('content', template.content);
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      templatesQuery.isLoading
                        ? 'Loading templates…'
                        : (templatesQuery.data?.length ?? 0) === 0
                          ? 'No templates yet'
                          : 'Pick a template to auto-fill content'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {templatesQuery.data?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          rows={6}
          placeholder="What do you want to send?"
          {...register('content')}
        />
        {errors.content && (
          <p className="text-xs text-destructive">{errors.content.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="scheduledAtLocal">Scheduled time</Label>
        <Input
          id="scheduledAtLocal"
          type="datetime-local"
          {...register('scheduledAtLocal')}
        />
        {errors.scheduledAtLocal && (
          <p className="text-xs text-destructive">
            {errors.scheduledAtLocal.message}
          </p>
        )}
        {utcPreview && (
          <p className="text-xs text-muted-foreground">
            Will send at {utcPreview}
          </p>
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
