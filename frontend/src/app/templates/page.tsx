'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TemplateForm } from '@/components/templates/template-form';
import { TemplatesList } from '@/components/templates/templates-list';
import { templatesApi } from '@/lib/api/templates';

export default function TemplatesPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['templates'],
    queryFn: templatesApi.list,
  });

  const createMutation = useMutation({
    mutationFn: templatesApi.create,
    onSuccess: () => {
      toast.success('Template created');
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
        <p className="text-sm text-muted-foreground">
          Reusable message bodies. Pick one when creating a scheduled message.
        </p>
      </div>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-base font-medium">New template</h2>
        <TemplateForm
          submitLabel="Create"
          onSubmit={(values) => createMutation.mutateAsync(values)}
          isSubmitting={createMutation.isPending}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-medium">All templates</h2>
        {isLoading && (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            Failed to load templates: {(error as Error).message}
          </div>
        )}
        {data && <TemplatesList templates={data} />}
      </section>
    </div>
  );
}
