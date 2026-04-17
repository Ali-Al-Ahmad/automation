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
    mutationFn: (input: { content: string; scheduledAt: string }) =>
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
                Content
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{data.content}</p>
            </div>
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
              content: data.content,
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
