'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MessageForm } from '@/components/messages/message-form';
import { StatusBadge } from '@/components/messages/status-badge';
import { messagesApi } from '@/lib/api/messages';
import { toLocalInputValue } from '@/lib/format';

export default function EditMessagePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => messagesApi.get(id),
    enabled: Boolean(id),
  });

  const mutation = useMutation({
    mutationFn: (input: import('@/types/message').UpdateMessageInput) =>
      messagesApi.update(id, input),
    onSuccess: () => {
      toast.success('Message updated');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      router.push('/dashboard');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {error ? (error as Error).message : 'Message not found.'}
      </div>
    );
  }

  const readOnly = data.status !== 'PENDING';

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Message</h1>
          <p className="text-sm text-muted-foreground">
            {readOnly
              ? 'This message can no longer be edited.'
              : 'Update the content or scheduled time.'}
          </p>
        </div>
        <StatusBadge message={data} />
      </div>

      <div className="rounded-lg border bg-card p-6">
        {readOnly ? (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Kind
              </div>
              <p className="mt-1 text-sm">{data.kind}</p>
            </div>
            {data.mediaUrl && (
              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  Photo URL
                </div>
                <a
                  href={data.mediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block break-all text-sm text-primary underline"
                >
                  {data.mediaUrl}
                </a>
              </div>
            )}
            {data.content && (
              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  {data.kind === 'PHOTO' ? 'Caption' : 'Content'}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{data.content}</p>
              </div>
            )}
            {data.buttons && data.buttons.rows.length > 0 && (
              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  Buttons
                </div>
                <div className="mt-1 space-y-1">
                  {data.buttons.rows.map((row, i) => (
                    <div key={i} className="flex flex-wrap gap-2">
                      {row.map((b, j) => (
                        <span
                          key={j}
                          className="rounded-md border px-2 py-1 text-xs"
                        >
                          {b.text} → {b.url}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data.lastError && (
              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  Last error
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-destructive">
                  {data.lastError}
                </p>
              </div>
            )}
          </div>
        ) : (
          <MessageForm
            submitLabel="Save changes"
            showTemplatePicker={false}
            defaultValues={{
              kind: data.kind,
              content: data.content,
              mediaUrl: data.mediaUrl ?? '',
              disableWebPagePreview: data.disableWebPagePreview,
              buttons: data.buttons
                ? {
                    rows: data.buttons.rows.map((row) => ({
                      buttons: row.map((b) => ({ text: b.text, url: b.url })),
                    })),
                  }
                : undefined,
              scheduledAtLocal: toLocalInputValue(data.scheduledAt),
            }}
            onSubmit={(values) => mutation.mutateAsync(values)}
            isSubmitting={mutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
