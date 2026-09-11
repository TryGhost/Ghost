import { useCallback, useMemo, useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from '@tryghost/shade/components';
import { toast } from 'sonner';
import {
  type Snippet,
  useAddSnippet,
  useBrowseSnippets,
  useDeleteSnippet,
  useEditSnippet,
} from '@tryghost/admin-x-framework/api/snippets';
import type { CardConfigSnippet, CardConfigSnippetInput } from './card-config';
import { EDITOR_REQUEST_OPTIONS } from './request-options';

type PendingSnippetAction =
  | { kind: 'update'; snippet: Snippet; value: string }
  | { kind: 'delete'; snippet: Snippet };

export interface PostSnippets {
  snippets: CardConfigSnippet[];
  createSnippet?: (snippet: CardConfigSnippetInput) => void;
  deleteSnippet?: (snippet: { name: string }) => void;
  snippetDialog: React.ReactNode;
}

// Snippets for the card menu plus the create/update/delete flows and their
// confirmation dialogs
export function usePostSnippets({ canManage }: { canManage: boolean }): PostSnippets {
  const { data } = useBrowseSnippets({ requestOptions: EDITOR_REQUEST_OPTIONS });
  const addSnippet = useAddSnippet();
  const editSnippet = useEditSnippet();
  const removeSnippet = useDeleteSnippet();
  const [pending, setPending] = useState<PendingSnippetAction | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const records = useMemo(
    () =>
      (data?.snippets ?? [])
        .filter((snippet) => snippet.lexical !== null)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data?.snippets],
  );

  const snippets = useMemo<CardConfigSnippet[]>(
    () =>
      records.map((snippet) => ({
        id: snippet.id,
        name: snippet.name,
        value: snippet.lexical ?? '',
      })),
    [records],
  );

  const createSnippet = useCallback(
    (input: CardConfigSnippetInput) => {
      const nameLowerCase = input.name.trim().toLowerCase();
      const existing = records.find((snippet) => snippet.name.toLowerCase() === nameLowerCase);

      if (existing) {
        setPending({ kind: 'update', snippet: existing, value: input.value });
        return;
      }

      void addSnippet
        .mutateAsync({ name: input.name, lexical: input.value, mobiledoc: '{}' })
        .then(() => toast.success(`Snippet saved as "${input.name}"`))
        .catch(() => toast.error('Snippet save failed'));
    },
    [addSnippet, records],
  );

  const deleteSnippet = useCallback(
    ({ name }: { name: string }) => {
      const existing = records.find((snippet) => snippet.name === name);
      if (existing) {
        setPending({ kind: 'delete', snippet: existing });
      }
    },
    [records],
  );

  const close = () => setPending(null);

  const confirm = async () => {
    if (!pending) {
      return;
    }

    setIsRunning(true);
    try {
      if (pending.kind === 'update') {
        await editSnippet.mutateAsync({
          id: pending.snippet.id,
          name: pending.snippet.name,
          lexical: pending.value,
          mobiledoc: pending.snippet.mobiledoc || '{}',
        });
        toast.success(`Snippet "${pending.snippet.name}" updated`);
      } else {
        await removeSnippet.mutateAsync(pending.snippet.id);
      }
    } catch {
      toast.error(pending.kind === 'update' ? 'Snippet save failed' : 'Snippet delete failed');
    } finally {
      setIsRunning(false);
      close();
    }
  };

  const snippetDialog = (
    <AlertDialog open={pending !== null} onOpenChange={(open) => !open && !isRunning && close()}>
      <AlertDialogContent data-testid="snippet-confirm-modal">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {pending?.kind === 'delete' ? 'Confirm snippet deletion' : 'Update this snippet?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {pending?.kind === 'delete' ? (
              <>
                You’re about to delete the “<strong>{pending.snippet.name}</strong>” snippet. This
                is permanent, and will delete the snippet for all staff users. It will{' '}
                <strong>not</strong> change any posts where you’ve used this snippet in the past.
              </>
            ) : (
              <>
                “<strong>{pending?.snippet.name}</strong>” will be overwritten. Don’t worry, this
                will only affect using the snippet in the future. Any older posts using this snippet
                will stay the same.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button disabled={isRunning} variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={isRunning}
            variant={pending?.kind === 'delete' ? 'destructive' : 'default'}
            onClick={() => void confirm()}
          >
            {pending?.kind === 'delete' ? 'Delete snippet' : 'Update'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return {
    snippets,
    createSnippet: canManage ? createSnippet : undefined,
    deleteSnippet: canManage ? deleteSnippet : undefined,
    snippetDialog,
  };
}
