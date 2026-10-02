import { useEffect, useRef, useState } from 'react';
import { Box, Stack, Text } from '@tryghost/shade/primitives';
import { Button } from '@tryghost/shade/components';
import { formatNumber } from '@tryghost/shade/utils';

import { CanvasBoard } from '@/builder/canvas/canvas-board';
import { captureOverview } from '@/builder/canvas/capture-overview';
import {
  measureExpandedComposition,
  waitForCompositionLayout,
} from '@/builder/canvas/measure-expanded-composition';
import { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';
import { instance, loadAssets } from './fixture';

import type { CanvasFrame, CanvasFrameInput } from '@/builder/canvas/canvas-board';
import type { PreviewDocument } from '@/builder/workspaces/theme/preview/preview-document';
import type { CapturedOverview } from '@/builder/canvas/capture-overview';
import type { ExpandedComposition } from '@/builder/canvas/measure-expanded-composition';

type CaptureState =
  | { status: 'pending' }
  | { status: 'current'; capture: CapturedOverview; duration: number }
  | { status: 'failed'; message: string };

type ExpandedState =
  | { status: 'pending' }
  | { status: 'current'; composition: ExpandedComposition; surfaceId: string; duration: number }
  | { status: 'failed'; message: string };

type OverviewMode = 'captured' | 'expanded' | 'device';

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

function ExpandedPreview({
  frame,
  document,
  visible,
  onInput,
  onResult,
}: {
  frame: CanvasFrame;
  document: PreviewDocument;
  visible: boolean;
  onInput: (input: CanvasFrameInput) => void;
  onResult: (state: ExpandedState) => void;
}) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const [surfaceId] = useState(() => crypto.randomUUID());
  const inputHandler = useRef(onInput);
  inputHandler.current = onInput;
  const resultHandler = useRef(onResult);
  resultHandler.current = onResult;
  const [result, setResult] = useState<ExpandedComposition | null>(null);
  const [failed, setFailed] = useState(false);
  const width = frame.viewport?.width ?? frame.width;
  const height = frame.viewport?.height ?? frame.height;
  useEffect(() => {
    const controller = new AbortController();
    const element = iframe.current!;
    element.style.height = `${height}px`;
    setResult(null);
    setFailed(false);
    resultHandler.current({ status: 'pending' });
    const surface = new IframePreviewDocumentSurface(element, { canvasNavigation: true });
    surface.onCanvasInput((input) => inputHandler.current(input));
    const started = performance.now();
    void surface
      .setInteractionMode('select', controller.signal)
      .then(() => surface.replaceDocument(document, null, controller.signal))
      .then(() =>
        measureExpandedComposition(
          surface,
          (next, signal) => {
            element.style.height = `${next}px`;
            return waitForCompositionLayout(signal);
          },
          frame.id,
          document.revision,
          controller.signal,
        ),
      )
      .then((composition) => {
        if (!controller.signal.aborted) {
          setResult(composition);
          resultHandler.current({
            status: 'current',
            composition,
            surfaceId,
            duration: performance.now() - started,
          });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setFailed(true);
          resultHandler.current({
            status: 'failed',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });
    return () => {
      controller.abort();
      surface.destroy();
    };
  }, [document, frame.id, width, height, surfaceId]);
  return (
    <iframe
      ref={iframe}
      className={`absolute top-0 left-0 border-0 ${visible && result ? '' : 'invisible'}`}
      data-expanded-document={result?.documentId}
      data-expanded-revision={result?.revision}
      data-expanded-status={result?.status ?? (failed ? 'failed' : 'pending')}
      data-expanded-surface={surfaceId}
      style={{ width, height }}
      title={`${frame.label} expanded comparison`}
    />
  );
}

function Preview({
  frame,
  document,
  onInput,
  opened,
  mode,
  expanded,
  captureTick,
  onCapture,
  onExpanded,
}: {
  frame: CanvasFrame;
  document: PreviewDocument;
  onInput: (input: CanvasFrameInput) => void;
  opened: boolean;
  mode: OverviewMode;
  expanded: ExpandedState | undefined;
  captureTick: number;
  onCapture: (state: CaptureState) => void;
  onExpanded: (state: ExpandedState) => void;
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
  const showCapture = mode === 'captured' && !opened && overview !== null;
  const showExpanded =
    mode === 'expanded' &&
    !opened &&
    expanded?.status === 'current' &&
    expanded.composition.revision === document.revision;
  return (
    <>
      <iframe
        ref={iframe}
        className={`absolute top-0 left-0 border-0 ${showCapture || showExpanded ? 'invisible' : ''}`}
        style={{
          width: frame.viewport?.width ?? frame.width,
          height: frame.viewport?.height ?? frame.height,
        }}
        title={`${frame.label} preview`}
      />
      <ExpandedPreview
        document={document}
        frame={frame}
        visible={showExpanded}
        onInput={onInput}
        onResult={onExpanded}
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
  const [expanded, setExpanded] = useState<Record<string, ExpandedState>>({});
  const [mode, setMode] = useState<OverviewMode>('captured');
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
    const expandedState = expanded[frame.id];
    const composition =
      expandedState?.status === 'current' &&
      expandedState.composition.revision === documents[frame.id]?.revision
        ? expandedState.composition
        : null;
    const showCapture = mode === 'captured' && capture;
    const showExpanded = mode === 'expanded' && composition;
    return {
      ...frame,
      viewport: { width: frame.width, height: frame.height },
      height: showCapture
        ? capture.documentHeight
        : showExpanded
          ? composition.viewport.height
          : frame.height,
      overviewLabel: showCapture
        ? 'Captured composition'
        : showExpanded
          ? `Expanded composition · actual CSS ${formatNumber(composition.viewport.width)} × ${formatNumber(composition.viewport.height)} · ${composition.status}`
          : 'Live device',
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
          Compare captures and separate expanded compositions · Open a frame for its retained fixed
          device · Expanded height changes viewport-dependent layout. Captures omit external
          imagery. Neither experiment establishes animation, sticky behavior, or loaded lazy
          content. Source comparisons, inline editing, and native site tools remain pending.
        </Text>
        <Button
          aria-pressed={mode === 'captured'}
          size="sm"
          variant="outline"
          onClick={() => setMode('captured')}
        >
          Captured compositions
        </Button>
        <Button
          aria-pressed={mode === 'expanded'}
          size="sm"
          variant="outline"
          onClick={() => setMode('expanded')}
        >
          Expanded compositions
        </Button>
        <Button
          aria-pressed={mode === 'device'}
          size="sm"
          variant="outline"
          onClick={() => setMode('device')}
        >
          Device viewports
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
          const expandedState = expanded[frame.id];
          return (
            <Stack key={frame.id} gap="none">
              <Text size="xs" tone="secondary">
                {frame.label}:{' '}
                {state?.status === 'current'
                  ? `${formatNumber(state.capture.coveredHeight)} / ${formatNumber(state.capture.documentHeight)}px captured in ${formatNumber(Math.round(state.duration))}ms${state.capture.warnings.length ? ` · ${state.capture.warnings.join(' ')}` : ''}`
                  : state?.status === 'failed'
                    ? state.message
                    : 'Capture pending'}
              </Text>
              <Text size="xs" tone="secondary">
                {frame.label} expanded:{' '}
                {expandedState?.status === 'current'
                  ? `CSS ${formatNumber(expandedState.composition.viewport.width)} × ${formatNumber(expandedState.composition.viewport.height)} · observed document ${formatNumber(expandedState.composition.document.height)}px · ${expandedState.composition.status} · ${formatNumber(expandedState.composition.measurements.length)} observations · measurement ${formatNumber(Math.round(expandedState.composition.duration))}ms · load + measurement ${formatNumber(Math.round(expandedState.duration))}ms · ${expandedState.composition.warnings.join(' ')}`
                  : expandedState?.status === 'failed'
                    ? `${expandedState.message} Fixed device fallback remains available.`
                    : 'Measurement pending; fixed device fallback remains available.'}
              </Text>
            </Stack>
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
                captureTick={captureTick}
                document={documents[frame.id]}
                expanded={expanded[frame.id]}
                frame={frame}
                mode={mode}
                opened={opened}
                onCapture={(state) => setCaptures((current) => ({ ...current, [frame.id]: state }))}
                onExpanded={(state) =>
                  setExpanded((current) => ({ ...current, [frame.id]: state }))
                }
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
