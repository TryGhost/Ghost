import { useEffect, useRef, useState } from 'react';
import { Box, Stack, Text } from '@tryghost/shade/primitives';
import { Button } from '@tryghost/shade/components';
import { formatNumber } from '@tryghost/shade/utils';

import { CanvasBoard } from '@/builder/canvas/canvas-board';
import { captureOverview } from '@/builder/canvas/capture-overview';
import { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';
import { instance, loadAssets } from './fixture';

import type { CanvasFrame, CanvasFrameInput } from '@/builder/canvas/canvas-board';
import type { PreviewDocument } from '@/builder/workspaces/theme/preview/preview-document';
import type { CapturedOverview } from '@/builder/canvas/capture-overview';

type CaptureState =
  | { status: 'pending' }
  | { status: 'current'; capture: CapturedOverview; duration: number }
  | { status: 'failed'; message: string };

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
  opened,
  captured,
  captureTick,
  onCapture,
}: {
  frame: CanvasFrame;
  document: PreviewDocument;
  onInput: (input: CanvasFrameInput) => void;
  opened: boolean;
  captured: boolean;
  captureTick: number;
  onCapture: (state: CaptureState) => void;
}) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const inputHandler = useRef(onInput);
  inputHandler.current = onInput;
  const captureHandler = useRef(onCapture);
  captureHandler.current = onCapture;
  const [ready, setReady] = useState<{
    surface: IframePreviewDocumentSurface;
    document: PreviewDocument;
  } | null>(null);
  const [overview, setOverview] = useState<CapturedOverview | null>(null);
  const [status, setStatus] = useState('Loading preview…');
  useEffect(() => {
    const controller = new AbortController();
    setReady(null);
    setOverview(null);
    captureHandler.current({ status: 'pending' });
    const surface = new IframePreviewDocumentSurface(iframe.current!, { canvasNavigation: true });
    surface.onCanvasInput((input) => inputHandler.current(input));
    // Canvas visitor links must select instead of navigating; no Browse mode.
    void surface
      .setInteractionMode('select', controller.signal)
      .then(() => surface.replaceDocument(document, null, controller.signal))
      .then(() => {
        if (!controller.signal.aborted) {
          setStatus('Ready');
          setReady({ surface, document });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setStatus(error instanceof Error ? error.message : String(error));
          captureHandler.current({
            status: 'failed',
            message: 'The device preview failed to load.',
          });
        }
      });
    return () => {
      controller.abort();
      surface.destroy();
    };
  }, [document]);
  useEffect(() => {
    if (!ready || ready.document !== document) {
      return;
    }
    const controller = new AbortController();
    setOverview(null);
    captureHandler.current({ status: 'pending' });
    const started = performance.now();
    void captureOverview(ready.surface, frame.id, document.revision, controller.signal)
      .then((capture) => {
        if (!controller.signal.aborted) {
          setOverview(capture);
          captureHandler.current({
            status: 'current',
            capture,
            duration: performance.now() - started,
          });
        }
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          captureHandler.current({
            status: 'failed',
            message: failure instanceof Error ? failure.message : String(failure),
          });
        }
      });
    return () => controller.abort();
  }, [ready, document, frame.id, captureTick]);
  const showCapture = captured && !opened && overview !== null;
  return (
    <>
      <iframe
        ref={iframe}
        className={`absolute top-0 left-0 border-0 ${showCapture ? 'invisible' : ''}`}
        style={{
          width: frame.viewport?.width ?? frame.width,
          height: frame.viewport?.height ?? frame.height,
        }}
        title={`${frame.label} preview`}
      />
      {showCapture && (
        <Box
          aria-label={`${frame.label} captured composition`}
          className="absolute inset-0 bg-surface-elevated"
          data-capture-artifact={overview.artifactId}
          data-capture-document={overview.documentId}
          data-capture-revision={overview.revision}
        >
          {overview.tiles.map((tile) => (
            <img
              key={tile.y}
              alt={`${frame.label} composition at ${formatNumber(tile.y)} CSS pixels`}
              className="absolute left-0 block"
              height={tile.height}
              src={tile.dataUrl}
              style={{ top: tile.y }}
              width={tile.width}
            />
          ))}
          {overview.coveredHeight < overview.documentHeight && (
            <Box
              className="absolute left-0 w-full bg-surface-elevated"
              padding="md"
              style={{ top: overview.coveredHeight }}
            >
              <Text>Remaining content was not captured. Open the live device to inspect it.</Text>
            </Box>
          )}
        </Box>
      )}
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
  const [captures, setCaptures] = useState<Record<string, CaptureState>>({});
  const [captured, setCaptured] = useState(true);
  const [captureTick, setCaptureTick] = useState(0);
  const initialFitReady = frames.every(
    (frame) => captures[frame.id]?.status === 'current' || captures[frame.id]?.status === 'failed',
  );
  const displayFrames = frames.map((frame) => {
    const state = captures[frame.id];
    const capture =
      state?.status === 'current' && state.capture.revision === documents[frame.id]?.revision
        ? state.capture
        : null;
    return {
      ...frame,
      viewport: { width: frame.width, height: frame.height },
      height: captured && capture ? capture.documentHeight : frame.height,
      overviewLabel: captured && capture ? 'Captured composition' : 'Live device',
    };
  });
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
          Snapshot experiment · Open a frame for its live device · Captures omit external imagery
          and do not prove animation, sticky behavior, or loaded lazy content. Expanded-height
          comparison, inline editing, and native site tools remain pending.
        </Text>
        <Button size="sm" variant="outline" onClick={() => setCaptured((value) => !value)}>
          {captured ? 'Show device viewports' : 'Show captured compositions'}
        </Button>
        <Button
          disabled={!initialFitReady}
          size="sm"
          variant="ghost"
          onClick={() => setCaptureTick((value) => value + 1)}
        >
          Refresh captures
        </Button>
        {frames.map((frame) => {
          const state = captures[frame.id];
          return (
            <Text key={frame.id} size="xs" tone="secondary">
              {frame.label}:{' '}
              {state?.status === 'current'
                ? `${formatNumber(state.capture.coveredHeight)} / ${formatNumber(state.capture.documentHeight)}px captured in ${formatNumber(Math.round(state.duration))}ms${state.capture.warnings.length ? ` · ${state.capture.warnings.join(' ')}` : ''}`
                : state?.status === 'failed'
                  ? state.message
                  : 'Capture pending'}
            </Text>
          );
        })}
        {error && (
          <Text className="text-destructive" role="alert">
            {error}
          </Text>
        )}
      </Box>
      <Box className="min-h-0 flex-1">
        <CanvasBoard
          frames={displayFrames}
          initialFitReady={initialFitReady}
          renderFrame={(frame, onInput, { opened }) =>
            documents[frame.id] ? (
              <Preview
                captured={captured}
                captureTick={captureTick}
                document={documents[frame.id]}
                frame={frame}
                opened={opened}
                onCapture={(state) => setCaptures((current) => ({ ...current, [frame.id]: state }))}
                onInput={onInput}
              />
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
