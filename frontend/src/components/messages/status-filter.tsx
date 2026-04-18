'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MessageStatus } from '@/types/message';

const FILTER_VALUES = ['PENDING', 'SENT', 'FAILED'] as const;

type StatusFilterProps = {
  value: MessageStatus | 'ALL';
  onChange: (value: MessageStatus | 'ALL') => void;
};

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as MessageStatus | 'ALL')}
    >
      <SelectTrigger className="w-44">
        <SelectValue placeholder="Filter by status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All statuses</SelectItem>
        {FILTER_VALUES.map((s) => (
          <SelectItem key={s} value={s}>
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
