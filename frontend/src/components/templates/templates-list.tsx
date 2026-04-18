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
import { templatesApi } from '@/lib/api/templates';
import type { Template } from '@/types/template';

export function TemplatesList({ templates }: { templates: Template[] }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesApi.remove(id),
    onSuccess: () => {
      toast.success('Template deleted');
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (templates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No templates yet. Create one using the form above.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Content</TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.name}</TableCell>
              <TableCell
                className="max-w-[200px] truncate sm:max-w-[320px] lg:max-w-[420px]"
                title={t.content}
              >
                {t.content}
              </TableCell>
              <TableCell className="text-right">
                <div className="inline-flex gap-1">
                  <Button asChild size="icon" variant="ghost">
                    <Link href={`/templates/${t.id}`}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Link>
                  </Button>
                  <ConfirmDialog
                    title={`Delete "${t.name}"?`}
                    description="Messages you already scheduled from this template are unaffected."
                    confirmLabel="Delete"
                    destructive
                    onConfirm={() => deleteMutation.mutate(t.id)}
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
