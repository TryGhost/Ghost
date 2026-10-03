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
import { getThemeFixture, instance, loadAssets } from './fixture';
import { CanvasProbe, registerCanvasProbe } from './webmcp-probe';
import { FixtureClient } from './fixture-client';

import type { CanvasFrame, CanvasFrameInput, CanvasView } from '@/builder/canvas/canvas-board';
import type {
  PreviewDocument,
  PreviewInlineEditRequest,
  PreviewInlineEditResult,
} from '@/builder/workspaces/theme/preview/preview-document';
import type { BuilderSelectionContext } from '@/builder/core/workspace';
import type { FixtureRender } from './fixture-client';
import type { CapturedOverview } from '@/builder/canvas/capture-overview';
import type { ExpandedComposition } from '@/builder/canvas/measure-expanded-composition';
import type { ProbeRegistrationStatus } from './webmcp-probe';
import type { ThemeFixtureId } from './fixture';

type CaptureState =
  | { status: 'pending' }
  | { status: 'current'; capture: CapturedOverview; duration: number }
  | { status: 'failed'; message: string };

type ExpandedState =
  | { status: 'pending' }
  | { status: 'current'; composition: ExpandedComposition; surfaceId: string; duration: number }
  | { status: 'failed'; message: string };

type OverviewMode = 'captured' | 'expanded' | 'device';

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
    const surface = new IframePreviewDocumentSurface(element, {
      canvasNavigation: true,
      captureLoadedImages: true,
    });
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
  probe,
  draftOwner,
  open,
  onSurface,
  onSelection,
  onEdit,
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
  probe: CanvasProbe;
  draftOwner: string | null;
  open: () => void;
  onSurface: (
    id: string,
    entry: { surface: IframePreviewDocumentSurface; open: () => void } | null,
  ) => void;
  onSelection: (id: string, selection: BuilderSelectionContext | null) => void;
  onEdit: (
    edit: PreviewInlineEditRequest,
    document: PreviewDocument,
    signal: AbortSignal,
  ) => Promise<PreviewInlineEditResult>;
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
  const [surface, setSurface] = useState<IframePreviewDocumentSurface | null>(null);
  const handlers = useRef({ onSurface, onSelection, onEdit, open });
  handlers.current = { onSurface, onSelection, onEdit, open };
  useEffect(() => {
    const current = new IframePreviewDocumentSurface(iframe.current!, {
      canvasNavigation: true,
      captureLoadedImages: true,
    });
    current.onCanvasInput((input) => inputHandler.current(input));
    current.onSelection((selection) => handlers.current.onSelection(frame.id, selection));
    handlers.current.onSurface(frame.id, { surface: current, open: () => handlers.current.open() });
    setSurface(current);
    return () => {
      handlers.current.onSurface(frame.id, null);
      current.destroy();
    };
  }, [frame.id]);
  useEffect(() => {
    if (!surface) {
      return;
    }
    const controller = new AbortController();
    setReady(null);
    setOverview(null);
    captureHandler.current({ status: 'pending' });
    const connection = probe.attach(frame.id, surface, document);
    const removeEdit = surface.onInlineEdit((edit, signal) =>
      handlers.current.onEdit(edit, document, signal),
    );
    // Canvas visitor links must select instead of navigating; no Browse mode.
    void surface
      .setInteractionMode('select', controller.signal)
      .then(() => surface.replaceDocument(document, null, controller.signal))
      .then(() => connection.ready())
      .then(() => {
        if (!controller.signal.aborted) {
          setStatus('Ready');
          setReady({ surface, document });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          connection.fail();
          setStatus(error instanceof Error ? error.message : String(error));
          captureHandler.current({
            status: 'failed',
            message: 'The device preview failed to load.',
          });
        }
      });
    return () => {
      controller.abort();
      connection.dispose();
      removeEdit();
    };
  }, [surface, document, frame.id, probe]);
  useEffect(() => {
    if (!ready || ready.document !== document) {
      return;
    }
    const controller = new AbortController();
    // Only the opened frame or the retained owner can open an editor. A second
    // frame stays selectable until the user resumes or explicitly cancels.
    const editing = draftOwner === frame.id || (opened && !draftOwner);
    void ready.surface
      .setInteractionMode(editing ? 'edit' : 'select', controller.signal)
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setStatus(failure instanceof Error ? failure.message : String(failure));
        }
      });
    return () => controller.abort();
  }, [ready, document, opened, draftOwner, frame.id]);
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
        data-fixture-revision={ready?.document.revision}
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

export function CanvasHarness({
  fixtureId = 'casper',
  onDeviceSurface,
}: {
  fixtureId?: ThemeFixtureId;
  onDeviceSurface?: (id: string, surface: IframePreviewDocumentSurface | null) => void;
}) {
  // A fixture is selected once per harness mount; comparison links start a new page.
  const [fixture] = useState(() => getThemeFixture(fixtureId));
  const [revision, setRevision] = useState(fixture.revision);
  const [documents, setDocuments] = useState<Record<string, PreviewDocument>>({});
  const [error, setError] = useState<string | null>(null);
  const [captures, setCaptures] = useState<Record<string, CaptureState>>({});
  const [expanded, setExpanded] = useState<Record<string, ExpandedState>>({});
  const [mode, setMode] = useState<OverviewMode>('captured');
  const [probe, setProbe] = useState<CanvasProbe | null>(null);
  const [siteTools, setSiteTools] = useState<ProbeRegistrationStatus | 'pending'>('pending');
  const [draftOwner, setDraftOwner] = useState<string | null>(null);
  const owner = useRef<string | null>(null);
  const [commitPending, setCommitPending] = useState(false);
  const pendingCommit = useRef(false);
  const [selection, setSelection] = useState<{
    frameId: string;
    context: BuilderSelectionContext;
  } | null>(null);
  const surfaces = useRef(
    new Map<string, { surface: IframePreviewDocumentSurface; open: () => void }>(),
  );
  const sourceFiles = useRef({ ...fixture.theme });
  const session = useRef<{
    client: FixtureClient;
    deliver: (result: FixtureRender) => void;
  } | null>(null);
  const view = useRef<CanvasView>({
    camera: { x: 0, y: 0, scale: 1 },
    selectedFrameId: null,
    openedFrameId: null,
  });
  useEffect(() => {
    const current = new CanvasProbe(frames, instance.siteUrl);
    current.setView(view.current, 'captured');
    setProbe(current);
    const registration = registerCanvasProbe(window.document, current);
    let disposed = false;
    void registration.ready.then((status) => {
      if (!disposed) {
        setSiteTools(status);
      }
    });
    return () => {
      disposed = true;
      registration.dispose();
    };
  }, []);
  useEffect(() => {
    probe?.setView(view.current, mode);
  }, [probe, mode]);
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
    const client = new FixtureClient(fixture.id);
    let disposed = false;
    void Promise.all([client.render(), loadAssets(fixture.id)])
      .then(([result, assets]) => {
        if (disposed) {
          return;
        }
        const deliver = (rendered: FixtureRender) => {
          if (disposed) {
            return;
          }
          if (rendered.editedFile) {
            sourceFiles.current[rendered.editedFile.path] = rendered.editedFile.content;
          }
          setRevision(rendered.revision);
          setSelection(null);
          setDocuments(
            Object.fromEntries(
              frames.map((frame) => {
                const group = frame.group === 'Home' ? 'home' : 'post';
                return [
                  frame.id,
                  {
                    html: rendered.html[group],
                    url: new URL(instance.routes[group], instance.siteUrl).href,
                    revision: rendered.revision,
                    inlineTextTargets: rendered.inlineTextTargets,
                    editMarkerAttribute: rendered.editMarkerAttribute,
                    assets,
                  },
                ];
              }),
            ),
          );
        };
        session.current = { client, deliver };
        deliver(result);
      })
      .catch((failure: unknown) => {
        if (!disposed) {
          setError(failure instanceof Error ? failure.message : String(failure));
        }
      });
    return () => {
      disposed = true;
      session.current = null;
      client.dispose();
    };
  }, [fixture]);
  const editText = async (
    frameId: string,
    edit: PreviewInlineEditRequest,
    document: PreviewDocument,
    signal: AbortSignal,
  ): Promise<PreviewInlineEditResult> => {
    if (signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    const current = session.current;
    if (!current || pendingCommit.current || owner.current !== frameId || edit.kind !== 'text') {
      return {
        ok: false,
        message:
          'Resume the current text draft before committing. Only literal text editing is available here.',
      };
    }
    pendingCommit.current = true;
    setCommitPending(true);
    try {
      const result = await current.client.render({ ...edit, expectedRevision: document.revision });
      // Once submitted, publish the worker's actual accepted outcome even if
      // the original iframe was restored while the render was running.
      current.deliver(result);
      return { ok: true };
    } catch (failure) {
      return { ok: false, message: failure instanceof Error ? failure.message : String(failure) };
    } finally {
      pendingCommit.current = false;
      setCommitPending(false);
    }
  };
  return (
    <Stack className="h-full overflow-hidden" gap="none">
      <Box className="border-b border-border-default bg-background" padding="md">
        <Text weight="semibold">
          Canvas feasibility harness · {fixture.label} {fixture.version}
        </Text>
        <Text size="xs" tone="secondary">
          Compare complete fixtures in separate page loads:{' '}
          <a className="underline" href="?theme=casper">
            Casper
          </a>
          {' · '}
          <a className="underline" href="?theme=source">
            Source
          </a>
          .
        </Text>
        <Text size="sm" tone="secondary">
          Fixed device previews · Recorded Home/Post content · {revision}
        </Text>
        <Text data-site-tools-status={siteTools} size="xs" tone="secondary">
          {siteTools === 'registered'
            ? 'Read-only site tools registered · Native discovery and image consumption unverified.'
            : siteTools === 'unsupported'
              ? 'Site tools unavailable in this browser · Canvas navigation remains available.'
              : siteTools === 'failed'
                ? 'Site tool registration failed · Canvas navigation remains available.'
                : 'Checking site tools…'}
        </Text>
        <Text size="sm" tone="secondary">
          Compare captures and separate expanded compositions · Open a frame for its retained fixed
          device · Expanded height changes viewport-dependent layout. Captures omit unreadable
          imagery. Neither experiment establishes animation, sticky behavior, or loaded lazy
          content. Open a device and double-click literal template text to edit this local fixture.
          Enter commits to Home and Post; Escape cancels. Changes reset on reload. Dynamic text
          remains selectable.
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
        {draftOwner && (
          <Stack gap="xs">
            <Text size="sm">
              {commitPending ? 'Applying text edit…' : 'A text draft is retained.'}
            </Text>
            <Button
              size="sm"
              variant="outline"
              onClick={() => surfaces.current.get(draftOwner)?.open()}
            >
              Resume text draft
            </Button>
            <Button
              disabled={commitPending}
              size="sm"
              variant="ghost"
              onClick={() => {
                const current = surfaces.current.get(draftOwner);
                if (current) {
                  void current.surface
                    .cancelInlineTextEdit(new AbortController().signal)
                    .catch((failure: unknown) =>
                      setError(failure instanceof Error ? failure.message : String(failure)),
                    );
                }
              }}
            >
              Cancel text draft
            </Button>
          </Stack>
        )}
        {selection && (
          <Stack gap="xs">
            <Text size="sm">
              {frames.find((frame) => frame.id === selection.frameId)?.label}:{' '}
              {selection.context.label}
            </Text>
            <details>
              <summary>View template source · {selection.context.id}</summary>
              <pre className="max-h-40 overflow-auto text-xs">
                {(() => {
                  const source = (
                    selection.context.data as
                      | { source?: { path: string; line: number } }
                      | undefined
                  )?.source;
                  return source
                    ? sourceFiles.current[source.path]
                        ?.split('\n')
                        .slice(Math.max(0, source.line - 2), source.line + 2)
                        .join('\n')
                    : 'Source correspondence unavailable.';
                })()}
              </pre>
            </details>
          </Stack>
        )}
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
          renderFrame={(frame, onInput, { opened, open }) =>
            documents[frame.id] && probe ? (
              <Preview
                captureTick={captureTick}
                document={documents[frame.id]}
                draftOwner={draftOwner}
                expanded={expanded[frame.id]}
                frame={frame}
                mode={mode}
                open={open}
                opened={opened}
                probe={probe}
                onCapture={(state) => setCaptures((current) => ({ ...current, [frame.id]: state }))}
                onEdit={(edit, document, signal) => editText(frame.id, edit, document, signal)}
                onExpanded={(state) =>
                  setExpanded((current) => ({ ...current, [frame.id]: state }))
                }
                onInput={(input) => {
                  if (input.kind === 'inline-edit') {
                    if (input.box && (!owner.current || owner.current === frame.id)) {
                      owner.current = frame.id;
                      setDraftOwner(frame.id);
                    } else if (!input.box && owner.current === frame.id) {
                      owner.current = null;
                      setDraftOwner(null);
                    }
                  }
                  onInput(input);
                }}
                onSelection={(id, context) =>
                  setSelection(context ? { frameId: id, context } : null)
                }
                onSurface={(id, entry) => {
                  onDeviceSurface?.(id, entry?.surface ?? null);
                  if (entry) {
                    surfaces.current.set(id, entry);
                  } else {
                    surfaces.current.delete(id);
                  }
                }}
              />
            ) : (
              <Box padding="md">
                <Text>Rendering recorded theme…</Text>
              </Box>
            )
          }
          onViewChange={(state) => {
            view.current = state;
            probe?.setView(state, mode);
          }}
        />
      </Box>
    </Stack>
  );
}
