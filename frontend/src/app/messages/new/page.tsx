'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MessageForm } from '@/components/messages/message-form';
import { messagesApi } from '@/lib/api/messages';

export default function NewMessagePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: messagesApi.create,
    onSuccess: () => {
      toast.success('Message scheduled');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      router.push('/dashboard');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Schedule a message
        </h1>
        <p className="text-sm text-muted-foreground">
          The scheduler will dispatch it to your Telegram chat at the chosen
          time.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <MessageForm
          submitLabel="Schedule"
          onSubmit={(values) => mutation.mutateAsync(values)}
          isSubmitting={mutation.isPending}
        />
      </div>
    </div>
  );
}
