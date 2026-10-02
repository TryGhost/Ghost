import { useEffect, useRef, useState } from 'react';
import { Box, Stack, Text } from '@tryghost/shade/primitives';

import { CanvasBoard } from '@/builder/canvas/canvas-board';
import { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';
import { instance, loadAssets } from './fixture';

import type { CanvasFrame, CanvasFrameInput } from '@/builder/canvas/canvas-board';
import type { PreviewDocument } from '@/builder/workspaces/theme/preview/preview-document';

const revision = 'casper-5.7.0-recorded-content';
const frames: CanvasFrame[] = [
  {
    id: 'home-desktop',
    label: 'Home · Desktop',
    group: 'Home',
    x: 0,
    y: 0,
    width: 1440,
    height: 900,
  },
  {
    id: 'home-mobile',
    label: 'Home · Mobile',
    group: 'Home',
    x: 1488,
    y: 0,
    width: 390,
    height: 844,
  },
  {
    id: 'post-desktop',
    label: 'Post · Desktop',
    group: 'Post',
    x: 1974,
    y: 0,
    width: 1440,
    height: 900,
  },
  {
    id: 'post-mobile',
    label: 'Post · Mobile',
    group: 'Post',
    x: 3462,
    y: 0,
    width: 390,
    height: 844,
  },
];

function Preview({
  frame,
  document,
  onInput,
}: {
  frame: CanvasFrame;
  document: PreviewDocument;
  onInput: (input: CanvasFrameInput) => void;
}) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const inputHandler = useRef(onInput);
  inputHandler.current = onInput;
  const [status, setStatus] = useState('Loading preview…');
  useEffect(() => {
    const controller = new AbortController();
    const surface = new IframePreviewDocumentSurface(iframe.current!, { canvasNavigation: true });
    surface.onCanvasInput((input) => inputHandler.current(input));
    // Canvas visitor links must select instead of navigating; no Browse mode.
    void surface
      .setInteractionMode('select', controller.signal)
      .then(() => surface.replaceDocument(document, null, controller.signal))
      .then(() => setStatus('Ready'))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setStatus(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      controller.abort();
      surface.destroy();
    };
  }, [document]);
  return (
    <>
      <iframe ref={iframe} className="size-full border-0" title={`${frame.label} preview`} />
      <Text
        aria-live="polite"
        className="absolute bottom-0 left-0 rounded-tr bg-background px-2 py-1"
        size="xs"
      >
        {status}
      </Text>
    </>
  );
}

export function CanvasHarness() {
  const [documents, setDocuments] = useState<Record<string, PreviewDocument>>({});
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const worker = new Worker(new URL('./fixture.worker.ts', import.meta.url), { type: 'module' });
    let disposed = false;
    worker.onmessage = (event: MessageEvent<{ html?: Record<string, string>; error?: string }>) => {
      if (event.data.error) {
        setError(event.data.error);
      } else if (event.data.html) {
        const html = event.data.html;
        void loadAssets()
          .then((assets) => {
            if (!disposed) {
              setDocuments(
                Object.fromEntries(
                  frames.map((frame) => {
                    const group = frame.group === 'Home' ? 'home' : 'post';
                    return [
                      frame.id,
                      {
                        html: html[group],
                        url: new URL(instance.routes[group], instance.siteUrl).href,
                        revision,
                        assets,
                      },
                    ];
                  }),
                ),
              );
            }
          })
          .catch((failure: unknown) => {
            if (!disposed) {
              setError(failure instanceof Error ? failure.message : String(failure));
            }
          });
      }
    };
    worker.onerror = (event) => setError(event.message);
    worker.postMessage({});
    return () => {
      disposed = true;
      worker.terminate();
    };
  }, []);
  return (
    <Stack className="h-full overflow-hidden" gap="none">
      <Box className="border-b border-border-default bg-background" padding="md">
        <Text weight="semibold">Canvas feasibility harness · Casper</Text>
        <Text size="sm" tone="secondary">
          Fixed device previews · Recorded Home/Post content · {revision}
        </Text>
        <Text size="sm" tone="secondary">
          This first slice shows viewport crops. Full-page overview comparison, inline editing,
          capture, and native site tools are pending.
        </Text>
        {error && (
          <Text className="text-destructive" role="alert">
            {error}
          </Text>
        )}
      </Box>
      <Box className="min-h-0 flex-1">
        <CanvasBoard
          frames={frames}
          renderFrame={(frame, onInput) =>
            documents[frame.id] ? (
              <Preview document={documents[frame.id]} frame={frame} onInput={onInput} />
            ) : (
              <Box padding="md">
                <Text>Rendering recorded theme…</Text>
              </Box>
            )
          }
        />
      </Box>
    </Stack>
  );
}
