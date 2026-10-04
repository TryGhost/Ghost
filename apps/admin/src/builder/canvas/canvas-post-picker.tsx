import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { PageHeader } from '@tryghost/shade/patterns';
import { LucideIcon } from '@tryghost/shade/utils';
import type {
  CanvasEditorRender,
  CanvasPost,
  CanvasPostPage,
  CanvasPostSelection,
} from './canvas-driver';

export function CanvasPostPicker({
  selected,
  revision,
  dataGeneration,
  busy,
  kind = 'Post',
  list,
  select,
}: {
  selected: CanvasPost | null;
  revision: string;
  dataGeneration: number;
  busy: boolean;
  kind?: string;
  list: (page: number, signal: AbortSignal) => Promise<CanvasPostPage>;
  select: (input: CanvasPostSelection, signal: AbortSignal) => Promise<CanvasEditorRender>;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<CanvasPostPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const request = useRef<AbortController | null>(null);
  const load = useCallback(
    async (next: number) => {
      request.current?.abort();
      const current = new AbortController();
      request.current = current;
      setLoading(true);
      setError(null);
      try {
        const loaded = await list(next, current.signal);
        current.signal.throwIfAborted();
        setResult(loaded);
        setPage(next);
      } catch (failure) {
        if (!current.signal.aborted) {
          setError(failure instanceof Error ? failure.message : String(failure));
        }
      } finally {
        if (!current.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [list],
  );
  useEffect(() => {
    if (open) {
      void load(1);
    }
    return () => {
      request.current?.abort();
    };
  }, [open, load]);
  const choose = async (post: CanvasPost) => {
    if (busy || selecting) {
      return;
    }
    request.current?.abort();
    const current = new AbortController();
    request.current = current;
    setSelecting(true);
    setError(null);
    try {
      await select(
        { id: post.id, expectedRevision: revision, expectedDataGeneration: dataGeneration },
        current.signal,
      );
      if (!current.signal.aborted) {
        setOpen(false);
      }
    } catch (failure) {
      if (!current.signal.aborted) {
        setError(failure instanceof Error ? failure.message : String(failure));
      }
    } finally {
      setSelecting(false);
    }
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <PageHeader.Action label={`Choose preview ${kind}`} iconOnly>
          <LucideIcon.FileText />
        </PageHeader.Action>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label={`Preview ${kind}`}
        className="max-h-[70vh] w-80 overflow-y-auto"
        style={{ maxWidth: 'calc(100vw - 3.2rem)' }}
      >
        <Stack gap="md">
          <Text as="h2" weight="semibold">
            Preview {kind}
          </Text>
          <Text size="sm" tone="secondary">
            {selected ? selected.title : `No published ${kind} selected`}
          </Text>
          {error && (
            <Text role="alert" size="sm">
              {error}
            </Text>
          )}
          {loading && (
            <Text role="status" size="sm">
              Loading published {kind}s…
            </Text>
          )}
          {result && !result.posts.length && <Text size="sm">No published {kind}s found.</Text>}
          <Stack gap="xs">
            {result?.posts.map((post) => (
              <Button
                key={post.id}
                aria-label={`Use ${kind}: ${post.title}`}
                aria-pressed={post.id === selected?.id}
                className="h-auto justify-start text-left whitespace-normal"
                disabled={busy || loading || selecting}
                variant="ghost"
                onClick={() => void choose(post)}
              >
                {post.title || `Untitled ${kind}`}
              </Button>
            ))}
          </Stack>
          <Inline gap="sm" wrap>
            <Button
              disabled={loading || selecting}
              size="sm"
              variant="outline"
              onClick={() => void load(1)}
            >
              Load {kind}s
            </Button>
            {page > 1 && (
              <Button
                disabled={loading || selecting}
                size="sm"
                variant="outline"
                onClick={() => void load(page - 1)}
              >
                Previous {kind}s
              </Button>
            )}
            {result?.nextPage && (
              <Button
                disabled={loading || selecting}
                size="sm"
                variant="outline"
                onClick={() => void load(result.nextPage!)}
              >
                Next {kind}s
              </Button>
            )}
          </Inline>
        </Stack>
      </PopoverContent>
    </Popover>
  );
}
