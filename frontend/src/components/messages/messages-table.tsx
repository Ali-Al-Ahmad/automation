'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { messagesApi } from '@/lib/api/messages';
import { formatLocal } from '@/lib/format';
import type { Message } from '@/types/message';
import { StatusBadge } from './status-badge';

function buttonCount(m: Message): number {
  if (!m.buttons) return 0;
  return m.buttons.rows.reduce((acc, row) => acc + row.length, 0);
}

export function MessagesTable({ messages }: { messages: Message[] }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => messagesApi.remove(id),
    onSuccess: () => {
      toast.success('Message deleted');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (messages.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
        No messages yet.{' '}
        <Link href="/messages/new" className="font-medium text-foreground underline">
          Schedule one
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Content</TableHead>
            <TableHead>Scheduled</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Created</TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {messages.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="max-w-[200px] sm:max-w-[320px]" title={m.content}>
                <div className="flex items-center gap-2">
                  <Badge variant="slate">{m.kind}</Badge>
                  {buttonCount(m) > 0 && (
                    <Badge variant="slate">
                      {buttonCount(m)} btn{buttonCount(m) === 1 ? '' : 's'}
                    </Badge>
                  )}
                  <span className="truncate">
                    {m.kind === 'PHOTO' && !m.content
                      ? (m.mediaUrl ?? '(photo)')
                      : m.content}
                  </span>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatLocal(m.scheduledAt)}
              </TableCell>
              <TableCell>
                <StatusBadge message={m} />
              </TableCell>
              <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                {formatLocal(m.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <div className="inline-flex gap-1">
                  {m.status === 'PENDING' && (
                    <Button asChild size="icon" variant="ghost">
                      <Link href={`/messages/${m.id}`}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Link>
                    </Button>
                  )}
                  <ConfirmDialog
                    title="Delete this message?"
                    description="This can't be undone. If the message was scheduled, it will not be sent."
                    confirmLabel="Delete"
                    destructive
                    onConfirm={() => deleteMutation.mutate(m.id)}
                  >
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </ConfirmDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
