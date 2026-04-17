'use client';

import { Plus, Trash2, X } from 'lucide-react';
import {
  Control,
  FieldErrors,
  useFieldArray,
  UseFormRegister,
} from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { MessageFormValues } from './message-form-schema';

const MAX_ROWS = 8;
const MAX_BUTTONS_PER_ROW = 8;

interface ButtonsEditorProps {
  control: Control<MessageFormValues>;
  register: UseFormRegister<MessageFormValues>;
  errors: FieldErrors<MessageFormValues>;
}

export function ButtonsEditor({ control, register, errors }: ButtonsEditorProps) {
  const {
    fields: rowFields,
    append: appendRow,
    remove: removeRow,
  } = useFieldArray({
    control,
    name: 'buttons.rows',
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Inline buttons (optional)</p>
          <p className="text-xs text-muted-foreground">
            Each row renders as a line of tappable buttons under the message.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={rowFields.length >= MAX_ROWS}
          onClick={() =>
            appendRow({ buttons: [{ text: '', url: '' }] } as never)
          }
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add row
        </Button>
      </div>

      {rowFields.length === 0 && (
        <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
          No buttons. Click "Add row" to attach some.
        </p>
      )}

      {rowFields.map((row, rowIdx) => (
        <ButtonsRow
          key={row.id}
          rowIdx={rowIdx}
          control={control}
          register={register}
          errors={errors}
          onRemoveRow={() => removeRow(rowIdx)}
        />
      ))}
    </div>
  );
}

interface ButtonsRowProps {
  rowIdx: number;
  control: Control<MessageFormValues>;
  register: UseFormRegister<MessageFormValues>;
  errors: FieldErrors<MessageFormValues>;
  onRemoveRow: () => void;
}

function ButtonsRow({
  rowIdx,
  control,
  register,
  errors,
  onRemoveRow,
}: ButtonsRowProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `buttons.rows.${rowIdx}.buttons` as const,
  });

  const rowErrors = errors.buttons?.rows?.[rowIdx]?.buttons;

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          Row {rowIdx + 1}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemoveRow}
          className="h-7 px-2 text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove row
        </Button>
      </div>

      {fields.map((btn, btnIdx) => {
        const btnErrors = rowErrors?.[btnIdx];
        return (
          <div key={btn.id} className="space-y-1">
            <div className="flex gap-2">
              <Input
                placeholder="Button text"
                className="flex-1"
                {...register(
                  `buttons.rows.${rowIdx}.buttons.${btnIdx}.text` as const,
                )}
              />
              <Input
                placeholder="https://example.com"
                className="flex-[2]"
                {...register(
                  `buttons.rows.${rowIdx}.buttons.${btnIdx}.url` as const,
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (fields.length === 1) {
                    onRemoveRow();
                  } else {
                    remove(btnIdx);
                  }
                }}
                aria-label="Remove button"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {(btnErrors?.text || btnErrors?.url) && (
              <p className="text-xs text-destructive">
                {btnErrors?.text?.message ?? btnErrors?.url?.message}
              </p>
            )}
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={fields.length >= MAX_BUTTONS_PER_ROW}
        onClick={() => append({ text: '', url: '' })}
      >
        <Plus className="mr-1 h-3.5 w-3.5" /> Add button to this row
      </Button>
    </div>
  );
}
