import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { PageHeader } from '@tryghost/shade/patterns';
import {
  Button,
  DropdownMenuItem,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';

import { CanvasBoard } from '@/builder/canvas/canvas-board';
import { waitForCompositionLayout } from '@/builder/canvas/measure-expanded-composition';
import { observeExpandedComposition } from '@/builder/canvas/observe-expanded-composition';
import { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';
import { getThemeFixture, instance, loadAssets } from './fixture';
import { CanvasProbe, registerCanvasProbe } from './webmcp-probe';
import {
  DEFAULT_CANVAS_ROUTING_SOURCE,
  inspectCanvasRouting,
} from '@/builder/canvas/route-compatibility';
import { FixtureClient, FixtureRejectedError } from './fixture-client';

import type { CanvasFrame, CanvasFrameInput, CanvasView } from '@/builder/canvas/canvas-board';
import type {
  PreviewDocument,
  PreviewInlineEditRequest,
  PreviewInlineEditResult,
} from '@/builder/workspaces/theme/preview/preview-document';
import type { BuilderSelectionContext } from '@/builder/core/workspace';
import type { FixturePatch, FixtureRender } from './fixture-client';
import type { ExpandedComposition } from '@/builder/canvas/measure-expanded-composition';
import type { ProbeRegistrationStatus } from './webmcp-probe';
import type { ThemeFixtureId } from './fixture';

type ExpandedState =
  | { status: 'pending' }
  | {
      status: 'current';
      composition: ExpandedComposition;
      renderKey: string;
      surfaceId: string;
      duration: number;
    }
  | { status: 'failed'; message: string };

type OverviewMode = 'expanded' | 'device';

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

function LivePreview({
  frame,
  document,
  kind,
  visible,
  draftOwner,
  onInput,
  onExpanded,
  probe,
  onSurface,
  onSelection,
  onEdit,
  onAdmission,
  onDelivery,
}: {
  frame: CanvasFrame;
  document: PreviewDocument;
  kind: OverviewMode;
  visible: boolean;
  draftOwner: string | null;
  onInput: (input: CanvasFrameInput) => void;
  onExpanded: (state: ExpandedState) => void;
  probe: CanvasProbe;
  onDelivery: (id: string, document: PreviewDocument, status: 'ready' | 'failed') => void;
  onAdmission: (interactionTime: number) => boolean;
  onSurface: (id: string, surface: IframePreviewDocumentSurface | null) => void;
  onSelection: (
    id: string,
    selection: BuilderSelectionContext | null,
    interactionTime?: number,
  ) => void;
  onEdit: (
    edit: PreviewInlineEditRequest,
    document: PreviewDocument,
    signal: AbortSignal,
  ) => Promise<PreviewInlineEditResult>;
}) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const [surfaceId] = useState(() => crypto.randomUUID());
  const [surface, setSurface] = useState<IframePreviewDocumentSurface | null>(null);
  const [ready, setReady] = useState<PreviewDocument | null>(null);
  const lastMode = useRef<{ document: PreviewDocument; mode: 'edit' | 'select' } | null>(null);
  const [status, setStatus] = useState('Loading preview…');
  const [composition, setComposition] = useState<ExpandedComposition | null>(null);
  const [layoutStatus, setLayoutStatus] = useState('pending');
  const layoutPaused = useRef(false);
  const layoutReady = useRef(false);
  const layoutFailed = useRef(false);
  const layoutObservation = useRef<ReturnType<typeof observeExpandedComposition> | null>(null);
  const handlers = useRef({
    onInput,
    onExpanded,
    onSurface,
    onSelection,
    onEdit,
    onAdmission,
    onDelivery,
    visible,
    draftOwner,
  });
  handlers.current = {
    onInput,
    onExpanded,
    onSurface,
    onSelection,
    onEdit,
    onAdmission,
    onDelivery,
    visible,
    draftOwner,
  };
  const width = frame.viewport?.width ?? frame.width;
  const height = frame.viewport?.height ?? frame.height;
  useEffect(() => {
    const current = new IframePreviewDocumentSurface(iframe.current!, {
      canvasNavigation: true,
      canvasPanning: kind === 'expanded',
      inlineImageEditing: false,
      observeLayout: kind === 'expanded',
      admitInlineTextEdit: (interactionTime) => {
        const admitted = handlers.current.visible && handlers.current.onAdmission(interactionTime);
        if (admitted) {
          layoutPaused.current = true;
        }
        return admitted;
      },
      captureLoadedImages: true,
    });
    current.onCanvasInput((input) => {
      if (input.kind === 'inline-edit') {
        layoutPaused.current = !!input.box;
        if (!input.box) {
          layoutObservation.current?.resume();
        }
      }
      if (handlers.current.visible) {
        handlers.current.onInput(input);
      }
    });
    current.onSelection((selection, interactionTime) => {
      if (handlers.current.visible) {
        handlers.current.onSelection(frame.id, selection, interactionTime);
      }
    });
    handlers.current.onSurface(`${frame.id}:${kind}`, current);
    setSurface(current);
    return () => {
      handlers.current.onSurface(`${frame.id}:${kind}`, null);
      current.destroy();
    };
  }, [frame.id, kind]);
  useEffect(() => {
    if (!surface) {
      return;
    }
    const controller = new AbortController();
    setReady(null);
    setComposition(null);
    setLayoutStatus('pending');
    layoutPaused.current = false;
    layoutReady.current = false;
    layoutFailed.current = false;
    setStatus('Loading preview…');
    iframe.current!.style.height = `${height}px`;
    const connection = kind === 'device' ? probe.attach(frame.id, surface, document) : null;
    const removeEdit = surface.onInlineEdit((edit, signal) =>
      handlers.current.onEdit(edit, document, signal),
    );
    if (kind === 'expanded') {
      handlers.current.onExpanded({ status: 'pending' });
    }
    void surface
      .setInteractionMode('select', controller.signal)
      .then(() => surface.replaceDocument(document, null, controller.signal))
      .then(async () => {
        if (kind === 'expanded') {
          const observation = observeExpandedComposition({
            surface,
            resize: (next, signal) => {
              iframe.current!.style.height = `${next}px`;
              return waitForCompositionLayout(signal);
            },
            frameId: frame.id,
            revision: document.revision,
            viewport: { width, height },
            signal: controller.signal,
            isPaused: () =>
              layoutPaused.current ||
              handlers.current.draftOwner === frame.id ||
              (layoutReady.current &&
                (!!iframe.current?.matches(':hover') ||
                  iframe.current?.ownerDocument.activeElement === iframe.current)),
            onStart: () => setLayoutStatus('measuring'),
            onResult: (result) => {
              layoutReady.current = true;
              setComposition(result);
              setLayoutStatus(result.status);
              // Initial readiness also waits for the runtime's interaction mode.
              if (lastMode.current?.document === document) {
                setStatus('Ready');
              }
              handlers.current.onExpanded({
                status: 'current',
                composition: result,
                renderKey: document.renderKey ?? document.revision,
                surfaceId,
                duration: result.duration,
              });
            },
            onError: (failure) => {
              const message = failure instanceof Error ? failure.message : String(failure);
              layoutFailed.current = true;
              setReady(null);
              setComposition(null);
              iframe.current!.style.height = `${height}px`;
              setLayoutStatus('failed');
              setStatus(message);
              handlers.current.onExpanded({ status: 'failed', message });
              handlers.current.onDelivery(`${frame.id}:${kind}`, document, 'failed');
            },
          });
          layoutObservation.current = observation;
          await observation.ready;
        } else {
          await connection!.ready();
        }
        const mode =
          handlers.current.visible &&
          (!handlers.current.draftOwner || handlers.current.draftOwner === frame.id)
            ? 'edit'
            : 'select';
        await surface.setInteractionMode(mode, controller.signal);
        if (!controller.signal.aborted && !layoutFailed.current) {
          lastMode.current = { document, mode };
          setReady(document);
          setStatus('Ready');
          handlers.current.onDelivery(`${frame.id}:${kind}`, document, 'ready');
        }
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          connection?.fail();
          handlers.current.onDelivery(`${frame.id}:${kind}`, document, 'failed');
          const message = failure instanceof Error ? failure.message : String(failure);
          setStatus(message);
          if (kind === 'expanded') {
            setLayoutStatus('failed');
            handlers.current.onExpanded({ status: 'failed', message });
          }
        }
      });
    return () => {
      controller.abort();
      layoutObservation.current?.dispose();
      layoutObservation.current = null;
      connection?.dispose();
      removeEdit();
    };
  }, [surface, document, frame.id, kind, width, height, surfaceId, probe]);
  useEffect(() => {
    layoutObservation.current?.resume();
  }, [draftOwner]);
  useEffect(() => {
    const ownerDocument = iframe.current?.ownerDocument;
    const resume = () => layoutObservation.current?.resume();
    ownerDocument?.addEventListener('focusin', resume);
    window.addEventListener('focus', resume);
    return () => {
      ownerDocument?.removeEventListener('focusin', resume);
      window.removeEventListener('focus', resume);
    };
  }, []);
  useEffect(() => {
    if (!surface || ready !== document) {
      return;
    }
    const controller = new AbortController();
    const editing = visible && (!draftOwner || draftOwner === frame.id);
    const mode = editing ? 'edit' : 'select';
    if (lastMode.current?.document === document && lastMode.current.mode === mode) {
      return;
    }
    lastMode.current = { document, mode };
    void surface
      .setInteractionMode(editing ? 'edit' : 'select', controller.signal)
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setStatus(failure instanceof Error ? failure.message : String(failure));
        }
      });
    return () => controller.abort();
  }, [surface, ready, document, visible, draftOwner, frame.id]);
  return (
    <>
      <iframe
        ref={iframe}
        className={`absolute top-0 left-0 border-0 ${visible ? '' : 'invisible'}`}
        data-composition-revision={kind === 'expanded' ? ready?.revision : undefined}
        data-composition-status={kind === 'expanded' ? layoutStatus : undefined}
        data-composition-surface={kind === 'expanded' ? surfaceId : undefined}
        data-fixture-revision={kind === 'device' ? ready?.revision : undefined}
        data-preview-status={status}
        style={{
          width,
          height: kind === 'expanded' && composition ? composition.viewport.height : height,
        }}
        title={`${frame.label} ${kind === 'expanded' ? 'composition' : 'preview'}`}
        onPointerLeave={() => layoutObservation.current?.resume()}
      />
      {visible && status !== 'Ready' && (
        <Text
          aria-live="polite"
          className="absolute bottom-0 left-0 bg-background px-2 py-1"
          size="xs"
        >
          {status}
        </Text>
      )}
    </>
  );
}

export function CanvasHarness({
  fixtureId = 'casper',
  onDeviceSurface,
  onCompositionSurface,
  onProbe,
  onApplyThemePatch,
  routingYaml = DEFAULT_CANVAS_ROUTING_SOURCE,
}: {
  fixtureId?: ThemeFixtureId;
  onDeviceSurface?: (id: string, surface: IframePreviewDocumentSurface | null) => void;
  onCompositionSurface?: (id: string, surface: IframePreviewDocumentSurface | null) => void;
  onProbe?: (probe: CanvasProbe | null) => void;
  onApplyThemePatch?: (apply: ((patch: FixturePatch) => Promise<FixtureRender>) | null) => void;
  routingYaml?: unknown;
}) {
  // A fixture is selected once per harness mount.
  const [fixture] = useState(() => getThemeFixture(fixtureId));
  const [routingSource] = useState(() => routingYaml);
  const [routing] = useState(() => inspectCanvasRouting(routingYaml));
  const [revision, setRevision] = useState(fixture.revision);
  const [renderState, setRenderState] = useState({
    dataGeneration: 0,
    dataSnapshot: 'recorded' as FixtureRender['dataSnapshot'],
    renderKey: `${fixture.revision}:data-0`,
  });
  const acceptedRender = useRef<FixtureRender | null>(null);
  const delivery = useRef<{
    renderKey: string;
    acceptedAt: number;
    acceptedAfterMs: number;
    ready: Set<string>;
    failed: Set<string>;
    allComplete: boolean;
  } | null>(null);
  const [deliveryDiagnostics, setDeliveryDiagnostics] = useState<{
    renderKey: string;
    acceptedAfterMs: number;
    readySurfaces: string[];
    failedSurfaces: string[];
    allCompleteMs: number | null;
    devicesReadyMs: number | null;
    compositionsReadyMs: number | null;
    allReadyMs: number | null;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pendingRefresh = useRef(false);
  const refreshUncertain = useRef(false);
  const [refreshUnavailable, setRefreshUnavailable] = useState(false);
  const probeObserver = useRef(onProbe);
  probeObserver.current = onProbe;
  const [documents, setDocuments] = useState<Record<string, PreviewDocument>>({});
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, ExpandedState>>({});
  const [mode, setMode] = useState<OverviewMode>('expanded');
  const [fallbacks, setFallbacks] = useState<ReadonlySet<string>>(() => new Set());
  const [probe, setProbe] = useState<CanvasProbe | null>(null);
  const [siteTools, setSiteTools] = useState<ProbeRegistrationStatus | 'pending'>('pending');
  const [draftOwner, setDraftOwner] = useState<string | null>(null);
  const owner = useRef<string | null>(null);
  const latestInteractionIntent = useRef(0);
  const iframeInteractionTime = useRef<number | null>(null);
  const [commitPending, setCommitPending] = useState(false);
  const pendingCommit = useRef(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const sourceRestoreFocus = useRef(true);
  const [selection, setSelection] = useState<{
    frameId: string;
    context: BuilderSelectionContext;
  } | null>(null);
  useEffect(() => {
    sourceRestoreFocus.current = false;
    setSourceOpen(false);
  }, [selection]);
  const surfaces = useRef(
    new Map<string, { surface: IframePreviewDocumentSurface; reveal: () => void }>(),
  );
  const sourceFiles = useRef({ ...fixture.theme });
  const session = useRef<{
    client: FixtureClient;
    deliver: (result: FixtureRender, acceptedAfterMs?: number) => void;
  } | null>(null);
  const view = useRef<CanvasView>({
    camera: { x: 0, y: 0, scale: 1 },
    selectedFrameId: null,
  });
  useEffect(() => {
    const current = new CanvasProbe(frames, instance.siteUrl);
    current.setView(view.current, 'expanded');
    setProbe(current);
    probeObserver.current?.(current);
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
      probeObserver.current?.(null);
    };
  }, []);
  useEffect(() => {
    probe?.setView(view.current, mode);
  }, [probe, mode]);
  const initialFitReady = frames.every(
    (frame) => expanded[frame.id]?.status === 'current' || expanded[frame.id]?.status === 'failed',
  );
  const displayFrames = frames.map((frame) => {
    const displayedMode = mode === 'device' || fallbacks.has(frame.id) ? 'device' : 'expanded';
    const state = expanded[frame.id];
    const composition =
      state?.status === 'current' && state.renderKey === documents[frame.id]?.renderKey
        ? state.composition
        : null;
    return {
      ...frame,
      viewport: { width: frame.width, height: frame.height },
      height:
        displayedMode === 'expanded' && composition ? composition.viewport.height : frame.height,
      overviewLabel: displayedMode === 'expanded' ? 'Live composition' : 'Fixed viewport fallback',
    };
  });
  useEffect(() => {
    if (!routing.supported) {
      setError(routing.message);
      return;
    }
    const client = new FixtureClient(fixture.id, routingSource);
    let disposed = false;
    void Promise.all([client.render(), loadAssets(fixture.id)])
      .then(([result, assets]) => {
        if (disposed) {
          return;
        }
        let currentAssets = assets;
        const deliver = (rendered: FixtureRender, acceptedAfterMs = 0) => {
          if (disposed || rendered.unchanged) {
            return;
          }
          if (rendered.sourceChanges) {
            const nextAssets = { ...currentAssets };
            for (const [path, content] of Object.entries(rendered.sourceChanges)) {
              if (content === null) {
                delete sourceFiles.current[path];
                delete nextAssets[path];
              } else {
                sourceFiles.current[path] = content;
                if (path.startsWith('assets/')) {
                  nextAssets[path] = { content, binary: null };
                }
              }
            }
            currentAssets = nextAssets;
          }
          if (rendered.editedFile) {
            sourceFiles.current[rendered.editedFile.path] = rendered.editedFile.content;
          }
          setRevision(rendered.revision);
          acceptedRender.current = rendered;
          delivery.current = {
            renderKey: rendered.renderKey,
            acceptedAt: performance.now(),
            acceptedAfterMs,
            ready: new Set(),
            failed: new Set(),
            allComplete: false,
          };
          setRenderState({
            dataGeneration: rendered.dataGeneration,
            dataSnapshot: rendered.dataSnapshot,
            renderKey: rendered.renderKey,
          });
          setDeliveryDiagnostics({
            renderKey: rendered.renderKey,
            acceptedAfterMs,
            readySurfaces: [],
            failedSurfaces: [],
            allCompleteMs: null,
            devicesReadyMs: null,
            compositionsReadyMs: null,
            allReadyMs: null,
          });
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
                    renderKey: rendered.renderKey,
                    dataGeneration: rendered.dataGeneration,
                    inlineTextTargets: rendered.inlineTextTargets,
                    editMarkerAttribute: rendered.editMarkerAttribute,
                    assets: currentAssets,
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
  }, [fixture, routing, routingSource]);
  const unavailableOverviews =
    mode === 'expanded' ? frames.filter((frame) => expanded[frame.id]?.status === 'failed') : [];
  const boundedExpanded =
    mode === 'expanded' &&
    frames.some((frame) => {
      const state = expanded[frame.id];
      return state?.status === 'current' && state.composition.status !== 'settled';
    });
  useEffect(() => {
    const diagnostics = {
      fixture: { id: fixture.id, version: fixture.version, revision },
      routing,
      renderState,
      delivery: deliveryDiagnostics,
      refresh: { pending: refreshing, uncertain: refreshUnavailable },
      siteTools,
      displayedSurfaces: frames.map((frame) => ({
        frameId: frame.id,
        kind: mode === 'device' || fallbacks.has(frame.id) ? 'device' : 'expanded',
      })),
      compositions: frames.map((frame) => {
        const state = expanded[frame.id];
        return state?.status === 'current'
          ? {
              frameId: frame.id,
              status: state.status,
              revision: state.composition.revision,
              renderKey: state.renderKey,
              surfaceId: state.surfaceId,
              documentId: state.composition.documentId,
              viewport: state.composition.viewport,
              extent: state.composition.document,
              layoutStatus: state.composition.status,
              warnings: state.composition.warnings,
              durationMs: state.duration,
            }
          : {
              frameId: frame.id,
              status: state?.status ?? 'pending',
              message: state?.status === 'failed' ? state.message : undefined,
            };
      }),
    };
    probe?.setDiagnostics(diagnostics);
    // Diagnostics belong in the developer console and site tools, outside the canvas UI.
    // eslint-disable-next-line no-console
    console.debug('[Ghost canvas]', diagnostics);
  }, [
    fixture,
    routing,
    revision,
    renderState,
    deliveryDiagnostics,
    refreshing,
    refreshUnavailable,
    siteTools,
    expanded,
    probe,
    mode,
    fallbacks,
  ]);
  const surfaceDelivered = (id: string, document: PreviewDocument, status: 'ready' | 'failed') => {
    const current = delivery.current;
    if (
      !current ||
      current.renderKey !== document.renderKey ||
      (status === 'ready' ? current.ready : current.failed).has(id)
    ) {
      return;
    }
    (status === 'ready' ? current.failed : current.ready).delete(id);
    (status === 'ready' ? current.ready : current.failed).add(id);
    const elapsed = Math.round(performance.now() - current.acceptedAt);
    const devicesReady = frames.every((frame) => current.ready.has(`${frame.id}:device`));
    const compositionsReady = frames.every((frame) => current.ready.has(`${frame.id}:expanded`));
    current.allComplete = frames.every((frame) =>
      ['device', 'expanded'].every(
        (kind) =>
          current.ready.has(`${frame.id}:${kind}`) || current.failed.has(`${frame.id}:${kind}`),
      ),
    );
    setDeliveryDiagnostics((previous) => ({
      renderKey: current.renderKey,
      acceptedAfterMs: current.acceptedAfterMs,
      readySurfaces: [...current.ready],
      failedSurfaces: [...current.failed],
      allCompleteMs: current.allComplete ? elapsed : null,
      devicesReadyMs: devicesReady
        ? ((previous?.renderKey === current.renderKey ? previous.devicesReadyMs : null) ?? elapsed)
        : null,
      compositionsReadyMs: compositionsReady
        ? ((previous?.renderKey === current.renderKey ? previous.compositionsReadyMs : null) ??
          elapsed)
        : null,
      allReadyMs: devicesReady && compositionsReady ? elapsed : null,
    }));
  };
  const refreshContent = async () => {
    const current = session.current;
    const accepted = acceptedRender.current;
    if (
      !current ||
      !accepted ||
      pendingRefresh.current ||
      refreshUncertain.current ||
      pendingCommit.current ||
      owner.current ||
      !delivery.current?.allComplete
    ) {
      return;
    }
    pendingRefresh.current = true;
    setRefreshing(true);
    setSelection(null);
    setError(null);
    const restoreReads = probe?.invalidateForRefresh();
    const started = performance.now();
    try {
      const result = await current.client.refresh({
        snapshot: accepted.dataSnapshot === 'recorded' ? 'long-title' : 'recorded',
        expectedRevision: accepted.revision,
        expectedDataGeneration: accepted.dataGeneration,
      });
      current.deliver(result, Math.round(performance.now() - started));
    } catch (failure) {
      if (session.current === current) {
        if (failure instanceof FixtureRejectedError) {
          restoreReads?.();
        } else {
          // Lost transport does not prove that the worker adopted nothing.
          refreshUncertain.current = true;
          setRefreshUnavailable(true);
        }
        setError(
          `${failure instanceof Error ? failure.message : String(failure)}${failure instanceof FixtureRejectedError ? '' : ' Reload the local fixture to recover.'}`,
        );
      }
    } finally {
      if (session.current === current) {
        pendingRefresh.current = false;
        setRefreshing(false);
      }
    }
  };
  const applyThemePatch = useCallback(
    async (patch: FixturePatch): Promise<FixtureRender> => {
      const current = session.current;
      if (
        !current ||
        !acceptedRender.current ||
        pendingCommit.current ||
        pendingRefresh.current ||
        refreshUncertain.current ||
        owner.current ||
        !delivery.current?.allComplete
      ) {
        throw new FixtureRejectedError(
          'Finish the current draft or delivery before applying a theme patch.',
        );
      }
      pendingCommit.current = true;
      setCommitPending(true);
      setError(null);
      const restoreReads = probe?.invalidateForRefresh();
      try {
        const result = await current.client.applyThemePatch(patch);
        current.deliver(result);
        if (result.unchanged) {
          restoreReads?.();
        }
        return result;
      } catch (failure) {
        if (session.current === current) {
          if (failure instanceof FixtureRejectedError) {
            restoreReads?.();
          } else {
            refreshUncertain.current = true;
            setRefreshUnavailable(true);
          }
          setError(
            `${failure instanceof Error ? failure.message : String(failure)}${failure instanceof FixtureRejectedError ? '' : ' Reload the local fixture to recover.'}`,
          );
        }
        throw failure;
      } finally {
        if (session.current === current) {
          pendingCommit.current = false;
          setCommitPending(false);
        }
      }
    },
    [probe],
  );
  useEffect(() => {
    onApplyThemePatch?.(applyThemePatch);
    return () => {
      onApplyThemePatch?.(null);
    };
  }, [onApplyThemePatch, applyThemePatch]);
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
    if (
      pendingRefresh.current ||
      refreshUncertain.current ||
      !delivery.current?.allComplete ||
      acceptedRender.current?.renderKey !== document.renderKey
    ) {
      return {
        ok: false,
        message:
          'Wait for the current render to finish before committing text. Reload the local fixture if refresh was interrupted.',
      };
    }
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
      const result = await current.client.render({
        ...edit,
        expectedRevision: document.revision,
        expectedDataGeneration: document.dataGeneration ?? 0,
      });
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
      <Box className="shrink-0 border-b border-border-default bg-background px-4 py-2">
        <PageHeader blurredBackground={false} sticky={false}>
          <PageHeader.Left>
            <PageHeader.Title className="text-base">Canvas · {fixture.label}</PageHeader.Title>
          </PageHeader.Left>
          <PageHeader.Actions>
            <Popover
              open={sourceOpen && !!selection}
              onOpenChange={(open) => {
                if (open) {
                  sourceRestoreFocus.current = true;
                }
                setSourceOpen(open);
              }}
            >
              <PopoverTrigger asChild>
                <PageHeader.Action
                  data-source-selection={selection ? true : undefined}
                  disabled={!selection}
                  label="View template source"
                  iconOnly
                >
                  <LucideIcon.Code />
                  {selection && (
                    <span className="sr-only">
                      {frames.find((frame) => frame.id === selection.frameId)?.label}:{' '}
                      {selection.context.label} · {selection.context.id}
                    </span>
                  )}
                </PageHeader.Action>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                aria-label="Template source"
                className="w-80"
                style={{ maxWidth: 'calc(100vw - 3.2rem)' }}
                onCloseAutoFocus={(event) => {
                  if (
                    !sourceRestoreFocus.current ||
                    document.activeElement instanceof HTMLIFrameElement
                  ) {
                    event.preventDefault();
                  }
                }}
                onInteractOutside={(event) => {
                  const target = event.detail.originalEvent.target;
                  if (!(target instanceof Element && target.closest('[data-source-selection]'))) {
                    sourceRestoreFocus.current = false;
                  }
                }}
              >
                {selection && (
                  <Stack gap="xs" data-source-context>
                    <Text size="sm">
                      {frames.find((frame) => frame.id === selection.frameId)?.label}:{' '}
                      {selection.context.label}
                    </Text>
                    <Text size="xs">{selection.context.id}</Text>
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
                  </Stack>
                )}
              </PopoverContent>
            </Popover>
            <PageHeader.ActionGroup>
              <PageHeader.ActionGroup.MobileMenu>
                <PageHeader.ActionGroup.MobileMenuTrigger>
                  <PageHeader.Action label="Canvas views" iconOnly>
                    <LucideIcon.Ellipsis />
                  </PageHeader.Action>
                </PageHeader.ActionGroup.MobileMenuTrigger>
                <PageHeader.ActionGroup.MobileMenuContent>
                  <DropdownMenuItem disabled={!!draftOwner} onSelect={() => setMode('expanded')}>
                    <LucideIcon.Layers />
                    Full page
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!!draftOwner} onSelect={() => setMode('device')}>
                    <LucideIcon.Monitor />
                    Device
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={
                      !!draftOwner ||
                      commitPending ||
                      refreshing ||
                      refreshUnavailable ||
                      !delivery.current?.allComplete
                    }
                    onSelect={() => {
                      void refreshContent();
                    }}
                  >
                    <LucideIcon.RefreshCw />
                    {renderState.dataSnapshot === 'recorded'
                      ? 'Refresh recorded content'
                      : 'Restore recorded content'}
                  </DropdownMenuItem>
                </PageHeader.ActionGroup.MobileMenuContent>
              </PageHeader.ActionGroup.MobileMenu>
              <PageHeader.Action
                aria-pressed={mode === 'expanded'}
                disabled={!!draftOwner}
                label="Live compositions"
                onClick={() => setMode('expanded')}
              >
                <LucideIcon.Layers />
                Full page
              </PageHeader.Action>
              <PageHeader.Action
                aria-pressed={mode === 'device'}
                disabled={!!draftOwner}
                label="Device viewports"
                onClick={() => setMode('device')}
              >
                <LucideIcon.Monitor />
                Device
              </PageHeader.Action>
              <PageHeader.Action
                disabled={
                  !!draftOwner ||
                  commitPending ||
                  refreshing ||
                  refreshUnavailable ||
                  !delivery.current?.allComplete
                }
                label={
                  renderState.dataSnapshot === 'recorded'
                    ? 'Refresh recorded content'
                    : 'Restore recorded content'
                }
                onClick={() => {
                  void refreshContent();
                }}
              >
                <LucideIcon.RefreshCw />
                {refreshing
                  ? 'Refreshing…'
                  : renderState.dataSnapshot === 'recorded'
                    ? 'Refresh content'
                    : 'Restore content'}
              </PageHeader.Action>
            </PageHeader.ActionGroup>
          </PageHeader.Actions>
        </PageHeader>
        {unavailableOverviews.length > 0 && (
          <Text className="sr-only" role="status" size="xs">
            Full page unavailable for {unavailableOverviews.map((frame) => frame.label).join(', ')}.
            Use that frame’s fixed viewport control to continue.
          </Text>
        )}
        {boundedExpanded && (
          <Text className="sr-only" role="status" size="xs">
            A full page reached a layout limit. Use its fixed viewport control to inspect the rest.
          </Text>
        )}
        {draftOwner && (
          <Inline gap="sm" wrap>
            <Text size="sm">
              {commitPending ? 'Applying text edit…' : 'A text draft is retained.'}
            </Text>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                surfaces.current
                  .get(
                    `${draftOwner}:${mode === 'device' || fallbacks.has(draftOwner) ? 'device' : 'expanded'}`,
                  )
                  ?.reveal()
              }
            >
              Resume text draft
            </Button>
            <Button
              disabled={commitPending}
              size="sm"
              variant="ghost"
              onClick={() => {
                const current = surfaces.current.get(
                  `${draftOwner}:${mode === 'device' || fallbacks.has(draftOwner) ? 'device' : 'expanded'}`,
                );
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
          </Inline>
        )}
        {error && (
          <Text className="text-destructive" role="alert">
            {error}
          </Text>
        )}
        {!routing.supported && (
          <Button variant="link" asChild>
            <a href={instance.siteUrl} rel="noopener noreferrer" target="_blank">
              Open site preview
            </a>
          </Button>
        )}
      </Box>
      <Box className="min-h-0 flex-1">
        <CanvasBoard
          frames={displayFrames}
          initialFitReady={initialFitReady}
          renderFrame={(frame, onInput, { reveal, select }) =>
            documents[frame.id] && probe ? (
              <>
                {(['device', 'expanded'] as const).map((kind) => (
                  <LivePreview
                    key={kind}
                    document={documents[frame.id]}
                    draftOwner={draftOwner}
                    frame={frame}
                    kind={kind}
                    probe={probe}
                    visible={
                      (mode === 'device' || fallbacks.has(frame.id) ? 'device' : 'expanded') ===
                      kind
                    }
                    onAdmission={(interactionTime) => {
                      if (
                        pendingRefresh.current ||
                        pendingCommit.current ||
                        refreshUncertain.current ||
                        !delivery.current?.allComplete ||
                        !delivery.current?.ready.has(`${frame.id}:${kind}`) ||
                        interactionTime < latestInteractionIntent.current ||
                        (owner.current && owner.current !== frame.id)
                      ) {
                        return false;
                      }
                      latestInteractionIntent.current = interactionTime;
                      owner.current = frame.id;
                      setDraftOwner(frame.id);
                      return true;
                    }}
                    onDelivery={surfaceDelivered}
                    onEdit={(edit, document, signal) => editText(frame.id, edit, document, signal)}
                    onExpanded={(state) =>
                      setExpanded((current) => ({ ...current, [frame.id]: state }))
                    }
                    onInput={(input) => {
                      if (input.kind === 'escape') {
                        if (
                          input.interactionTime === undefined ||
                          input.interactionTime < latestInteractionIntent.current
                        ) {
                          return;
                        }
                        iframeInteractionTime.current = input.interactionTime;
                        onInput(input);
                        iframeInteractionTime.current = null;
                        return;
                      }
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
                    onSelection={(id, context, interactionTime) => {
                      if (
                        pendingRefresh.current ||
                        pendingCommit.current ||
                        refreshUncertain.current ||
                        !delivery.current?.ready.has(`${frame.id}:${kind}`) ||
                        interactionTime === undefined ||
                        interactionTime < latestInteractionIntent.current
                      ) {
                        return;
                      }
                      if (context) {
                        iframeInteractionTime.current = interactionTime;
                        select();
                        iframeInteractionTime.current = null;
                      }
                      setSelection(context ? { frameId: id, context } : null);
                    }}
                    onSurface={(id, surface) => {
                      if (surface) {
                        surfaces.current.set(id, { surface, reveal });
                      } else {
                        surfaces.current.delete(id);
                      }
                      (kind === 'device' ? onDeviceSurface : onCompositionSurface)?.(
                        frame.id,
                        surface,
                      );
                    }}
                  />
                ))}
              </>
            ) : null
          }
          renderFrameActions={(frame) => {
            const device = mode === 'device' || fallbacks.has(frame.id);
            const state = expanded[frame.id];
            const warning =
              state?.status === 'failed'
                ? 'Full page unavailable. Use fixed viewport.'
                : state?.status === 'current' && state.composition.status !== 'settled'
                  ? 'Full page reached a layout limit. Use fixed viewport.'
                  : null;
            return (
              <Button
                aria-label={
                  device
                    ? `Use full page for ${frame.label}`
                    : `Use fixed viewport for ${frame.label}`
                }
                className="size-8 bg-background"
                disabled={!!draftOwner || mode === 'device'}
                size="sm"
                title={device ? 'Use full page' : (warning ?? 'Use fixed viewport')}
                variant="outline"
                onClick={() => {
                  latestInteractionIntent.current = performance.timeOrigin + performance.now();
                  for (const kind of ['device', 'expanded']) {
                    void surfaces.current
                      .get(`${frame.id}:${kind}`)
                      ?.surface.cancelPendingInlineTextEdit(new AbortController().signal)
                      .catch(() => {});
                  }
                  setSelection((current) => (current?.frameId === frame.id ? null : current));
                  setFallbacks((current) => {
                    const next = new Set(current);
                    if (next.has(frame.id)) {
                      next.delete(frame.id);
                    } else {
                      next.add(frame.id);
                    }
                    return next;
                  });
                }}
              >
                {device ? (
                  <LucideIcon.Layers />
                ) : warning ? (
                  <LucideIcon.TriangleAlert />
                ) : (
                  <LucideIcon.Monitor />
                )}
              </Button>
            );
          }}
          onSelectionIntent={() => {
            latestInteractionIntent.current =
              iframeInteractionTime.current ?? performance.timeOrigin + performance.now();
            if (owner.current) {
              void surfaces.current
                .get(
                  `${owner.current}:${mode === 'device' || fallbacks.has(owner.current) ? 'device' : 'expanded'}`,
                )
                ?.surface.cancelPendingInlineTextEdit(new AbortController().signal)
                .catch(() => {});
            }
          }}
          onViewChange={(state) => {
            view.current = state;
            probe?.setView(state, mode);
          }}
        />
      </Box>
    </Stack>
  );
}
