'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { TemplateForm } from '@/components/templates/template-form';
import { templatesApi } from '@/lib/api/templates';

export default function EditTemplatePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['templates', id],
    queryFn: () => templatesApi.get(id),
    enabled: Boolean(id),
  });

  const mutation = useMutation({
    mutationFn: (input: { name: string; content: string }) =>
      templatesApi.update(id, input),
    onSuccess: () => {
      toast.success('Template updated');
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      router.push('/templates');
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
        {error ? (error as Error).message : 'Template not found.'}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit template</h1>
      </div>
      <div className="rounded-lg border bg-card p-6">
        <TemplateForm
          submitLabel="Save changes"
          defaultValues={{ name: data.name, content: data.content }}
          onSubmit={(values) => mutation.mutateAsync(values)}
          isSubmitting={mutation.isPending}
        />
      </div>
    </div>
  );
}
