'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import type { CreateMessageInput } from '@/types/message';
import { ButtonsEditor } from './buttons-editor';
import {
  messageFormSchema,
  type MessageFormValues,
} from './message-form-schema';

export interface MessageFormSubmit extends CreateMessageInput {}

interface MessageFormProps {
  defaultValues?: Partial<MessageFormValues>;
  submitLabel: string;
  showTemplatePicker?: boolean;
  onSubmit: (values: MessageFormSubmit) => unknown | Promise<unknown>;
  isSubmitting?: boolean;
}

const DEFAULT_VALUES: MessageFormValues = {
  kind: 'TEXT',
  content: '',
  mediaUrl: '',
  disableWebPagePreview: false,
  buttons: undefined,
  scheduledAtLocal: '',
};

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
    resolver: zodResolver(messageFormSchema),
    defaultValues: { ...DEFAULT_VALUES, ...defaultValues },
  });

  const templatesQuery = useQuery({
    queryKey: ['templates'],
    queryFn: templatesApi.list,
    enabled: showTemplatePicker,
  });

  const kind = watch('kind');
  const scheduledAtLocal = watch('scheduledAtLocal');
  const utcPreview = scheduledAtLocal
    ? formatUtc(toUtcIso(scheduledAtLocal))
    : '';

  const submit = handleSubmit(async (values) => {
    const iso = toUtcIso(values.scheduledAtLocal);
    if (!iso) return;

    const payload: MessageFormSubmit = {
      kind: values.kind,
      scheduledAt: iso,
    };

    if (values.kind === 'TEXT') {
      payload.content = values.content!.trim();
      if (values.disableWebPagePreview) payload.disableWebPagePreview = true;
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
  });

  return (
    <form onSubmit={submit} className="space-y-5">
      {showTemplatePicker && (
        <div className="space-y-2">
          <Label>Template (optional)</Label>
          <Controller
            name="kind"
            control={control}
            render={() => (
              <Select
                onValueChange={(id) => {
                  const template = templatesQuery.data?.find(
                    (t) => t.id === id,
                  );
                  if (!template) return;
                  setValue('kind', template.kind, { shouldValidate: true });
                  setValue('content', template.content ?? '');
                  setValue('mediaUrl', template.mediaUrl ?? '');
                  setValue(
                    'disableWebPagePreview',
                    template.disableWebPagePreview,
                  );
                  setValue(
                    'buttons',
                    template.buttons
                      ? {
                          rows: template.buttons.rows.map((row) => ({
                            buttons: row.map((b) => ({
                              text: b.text,
                              url: b.url,
                            })),
                          })),
                        }
                      : undefined,
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      templatesQuery.isLoading
                        ? 'Loading templates…'
                        : (templatesQuery.data?.length ?? 0) === 0
                          ? 'No templates yet'
                          : 'Pick a template to auto-fill the form'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {templatesQuery.data?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} · {t.kind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

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
          <p className="text-xs text-muted-foreground">
            Must be a publicly reachable http(s) URL — Telegram fetches it at
            send time.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="content">
          {kind === 'PHOTO' ? 'Caption (optional)' : 'Content'}
        </Label>
        <Textarea
          id="content"
          rows={6}
          placeholder={
            kind === 'PHOTO'
              ? 'Optional caption under the photo (max 1024 chars)…'
              : 'What do you want to send?'
          }
          {...register('content')}
        />
        {errors.content && (
          <p className="text-xs text-destructive">{errors.content.message}</p>
        )}
      </div>

      {kind === 'TEXT' && (
        <Controller
          name="disableWebPagePreview"
          control={control}
          render={({ field }) => (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
                className="mt-0.5"
              />
              <span>
                Disable link preview
                <span className="ml-1 text-xs text-muted-foreground">
                  (suppresses auto-generated cards for URLs in the text)
                </span>
              </span>
            </label>
          )}
        />
      )}

      <ButtonsEditor control={control} register={register} errors={errors} />

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
