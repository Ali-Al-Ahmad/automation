'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { MessagesTable } from '@/components/messages/messages-table';
import { StatusFilter } from '@/components/messages/status-filter';
import { messagesApi } from '@/lib/api/messages';
import type { MessageStatus } from '@/types/message';

export default function DashboardPage() {
  const [status, setStatus] = useState<MessageStatus | 'ALL'>('ALL');

  const { data, isLoading, error } = useQuery({
    queryKey: ['messages', { status }],
    queryFn: () =>
      messagesApi.list({ status: status === 'ALL' ? undefined : status }),
    refetchInterval: 10_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            All scheduled messages. Auto-refreshes every 10 seconds.
          </p>
        </div>
        <StatusFilter value={status} onChange={setStatus} />
      </div>

      {isLoading && (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load messages: {(error as Error).message}
        </div>
      )}

      {data && <MessagesTable messages={data.items} />}
    </div>
  );
}
