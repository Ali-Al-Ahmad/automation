'use client';

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Message, MessageStatus } from '@/types/message';

const variantFor: Record<
  MessageStatus,
  'slate' | 'warning' | 'success' | 'destructive'
> = {
  PENDING: 'slate',
  SENDING: 'warning',
  SENT: 'success',
  FAILED: 'destructive',
};

export function StatusBadge({ message }: { message: Message }) {
  const badge = (
    <Badge variant={variantFor[message.status]}>
      {message.status.toLowerCase()}
    </Badge>
  );

  if (message.status === 'FAILED' && message.lastError) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="cursor-help">{badge}</button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">Last error</p>
            <p className="text-xs break-all">{message.lastError}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return badge;
}
