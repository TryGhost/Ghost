import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { PageHeader } from '@tryghost/shade/patterns';
import {
  Button,
  DropdownMenuItem,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Textarea,
} from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';

import { CanvasBoard } from '@/builder/canvas/canvas-board';
import { waitForCompositionLayout } from '@/builder/canvas/measure-expanded-composition';
import { observeExpandedComposition } from '@/builder/canvas/observe-expanded-composition';
import { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';

import { CanvasProbe, registerCanvasProbe } from './canvas-probe';
import { CanvasRejectedError } from './canvas-driver';
import { CanvasEditorTools } from './canvas-editor-tools';
import { startCanvasRelay } from './canvas-relay';
import { CanvasAgentConnection } from './canvas-agent-connection';
import { CanvasDesignSettings } from './canvas-design-settings';
import { CanvasPostPicker } from './canvas-post-picker';
import { canvasContentLabels } from './canvas-content';
import type { CanvasSettingsDraft } from './canvas-design-settings';
import { resolveCanvasTextDraft } from './canvas-text-draft';
import { parseEditMarker } from '@tryghost/theme-renderer/markers';
import type { CanvasTextDraft } from './canvas-text-draft';
import type {
  CanvasSource,
  CanvasContentKind,
  CanvasTemplateKind,
  CanvasContentSelection,
  CanvasDriver,
  CanvasPatch,
  CanvasEditorRender,
  CanvasHistory,
  CanvasHistoryRestore,
  CanvasPostSelection,
  CanvasPublicationActions,
  CanvasPublicationReview,
  CanvasPublishOptions,
  CanvasPublishResult,
} from './canvas-driver';
import type { ReactNode } from 'react';

import type { CanvasFrame, CanvasView } from '@/builder/canvas/canvas-board';
import type {
  PreviewDocument,
  PreviewInlineEditRequest,
  PreviewInlineEditResult,
  PreviewCanvasInput,
} from '@/builder/workspaces/theme/preview/preview-document';
import type { BuilderSelectionContext } from '@/builder/core/workspace';

import type { ExpandedComposition } from '@/builder/canvas/measure-expanded-composition';
import type { ProbeRegistrationStatus } from './canvas-probe';

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

function templateFrames(kinds: CanvasTemplateKind[]): CanvasFrame[] {
  // Keep devices close within a pair, with a wider 240px gap between template groups.
  const groupStride = 1440 + 48 + 390 + 240;
  return kinds.flatMap((kind, index) => {
    const label = kind === 'home' ? 'Home' : kind === 'error' ? '404' : canvasContentLabels[kind];
    return [
      {
        id: `${kind}-desktop`,
        label: `${label} · Desktop`,
        group: label,
        x: index * groupStride,
        y: 0,
        width: 1440,
        height: 900,
      },
      {
        id: `${kind}-mobile`,
        label: `${label} · Mobile`,
        group: label,
        x: index * groupStride + 1488,
        y: 0,
        width: 390,
        height: 844,
      },
    ];
  });
}
const frameKind = (frame: CanvasFrame) => frame.id.split('-')[0] as CanvasTemplateKind;

function LivePreview({
  frame,
  document,
  kind,
  visible,
  draftOwner,
  onInput,
  onExpanded,
  probe,
  reveal,
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
  onInput: (input: PreviewCanvasInput) => void;
  onExpanded: (state: ExpandedState) => void;
  probe: CanvasProbe;
  reveal: () => void;
  onDelivery: (id: string, document: PreviewDocument, status: 'ready' | 'failed') => void;
  onAdmission: (interactionTime: number) => boolean;
  onSurface: (id: string, surface: IframePreviewDocumentSurface | null, reveal: () => void) => void;
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
  const lastMeasuredSize = useRef<{ width: number; height: number } | null>(null);
  const [layoutStatus, setLayoutStatus] = useState('pending');
  const layoutPaused = useRef(false);
  const layoutReady = useRef(false);
  const layoutFailed = useRef(false);
  const layoutObservation = useRef<ReturnType<typeof observeExpandedComposition> | null>(null);
  const handlers = useRef({
    reveal,
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
    reveal,
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
      // Theme resources/fonts can load slowly without invalidating a live frame.
      timeoutMs: 15_000,
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
    handlers.current.onSurface(`${frame.id}:${kind}`, current, () => handlers.current.reveal());
    setSurface(current);
    return () => {
      handlers.current.onSurface(`${frame.id}:${kind}`, null, () => handlers.current.reveal());
      current.destroy();
    };
  }, [frame.id, kind]);
  useEffect(() => {
    if (!surface) {
      return;
    }
    const controller = new AbortController();
    setReady(null);
    setLayoutStatus('pending');
    layoutPaused.current = false;
    layoutReady.current = false;
    layoutFailed.current = false;
    setStatus('Loading preview…');
    // Retain geometry while replacing the document. Readiness still belongs to
    // the new render; the previous measurement is only a visual size hint.
    const retainedHeight =
      kind === 'expanded' && lastMeasuredSize.current?.width === width
        ? lastMeasuredSize.current.height
        : height;
    iframe.current!.style.height = `${retainedHeight}px`;
    const connection = probe.attach(frame.id, surface, document, kind);
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
              lastMeasuredSize.current = { width, height: result.frameHeight };
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
              connection.fail(failure);
              layoutFailed.current = true;
              setReady(null);
              iframe.current!.style.height = `${
                lastMeasuredSize.current?.width === width ? lastMeasuredSize.current.height : height
              }px`;
              setLayoutStatus('failed');
              setStatus(message);
              handlers.current.onExpanded({ status: 'failed', message });
              handlers.current.onDelivery(`${frame.id}:${kind}`, document, 'failed');
            },
          });
          layoutObservation.current = observation;
          await observation.ready;
        }
        await connection.ready();
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
          connection?.fail(failure);
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
          height:
            kind === 'expanded' && composition?.configuredViewport.width === width
              ? composition.frameHeight
              : height,
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

export function ThemeCanvas({
  source: inputSource,
  onDeviceSurface,
  onCompositionSurface,
  onProbe,
  onApplyThemePatch,
  headerLeading,
  headerActions,
  externalBusy = false,
  externalNotice,
  onActivity,
}: {
  source: CanvasSource;
  onDeviceSurface?: (id: string, surface: IframePreviewDocumentSurface | null) => void;
  onCompositionSurface?: (id: string, surface: IframePreviewDocumentSurface | null) => void;
  onProbe?: (probe: CanvasProbe | null) => void;
  onApplyThemePatch?: (apply: ((patch: CanvasPatch) => Promise<CanvasEditorRender>) | null) => void;
  headerLeading?: ReactNode;
  headerActions?: ReactNode | ((actions: CanvasPublicationActions) => ReactNode);
  externalBusy?: boolean;
  externalNotice?: string | null;
  onActivity?: (activity: {
    manualDraft: boolean;
    busy: boolean;
    mutationPending: boolean;
  }) => void;
}) {
  const [source] = useState(() => inputSource);
  const [frames] = useState(() => templateFrames(source.templateKinds ?? ['home', 'post']));
  const routing = source.routing;
  const [routes, setRoutes] = useState(source.routes);
  const [representativeContent, setRepresentativeContent] = useState(() =>
    Object.fromEntries(
      Object.entries(source.content ?? {}).map(([kind, provider]) => [kind, provider.selected]),
    ),
  );
  const [representativePost, setRepresentativePost] = useState(source.posts?.selected ?? null);
  const availableFrames = frames.filter((frame) => routes[frameKind(frame)]);
  const busy = useRef(externalBusy);
  busy.current = externalBusy;
  const activityObserver = useRef(onActivity);
  activityObserver.current = onActivity;
  const [revision, setRevision] = useState(source.revision);
  const [renderState, setRenderState] = useState({
    dataGeneration: 0,
    dataSnapshot: 'initial',
    renderKey: `${source.revision}:data-0`,
  });
  const acceptedRender = useRef<CanvasEditorRender | null>(null);
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
  const measuredFrameSizes = useRef(new Map<string, { width: number; height: number }>());
  const [mode, setMode] = useState<OverviewMode>('expanded');
  const [zoomControlsHost, setZoomControlsHost] = useState<HTMLDivElement | null>(null);
  const [fallbacks, setFallbacks] = useState<ReadonlySet<string>>(() => new Set());
  const [probe, setProbe] = useState<CanvasProbe | null>(null);
  const [siteTools, setSiteTools] = useState<ProbeRegistrationStatus | 'pending'>('pending');
  const [draftOwner, setDraftOwner] = useState<string | null>(null);
  const owner = useRef<string | null>(null);
  const latestInteractionIntent = useRef(0);
  const iframeInteractionTime = useRef<number | null>(null);
  const [commitPending, setCommitPending] = useState(false);
  const settingsDraft = useRef<CanvasSettingsDraft | null>(null);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const observeSettingsDraft = useCallback((draft: CanvasSettingsDraft | null) => {
    settingsDraft.current = draft;
    setSettingsDirty(!!draft);
  }, []);
  const [history, setHistory] = useState<CanvasHistory | null>(null);
  const textDraft = useRef<CanvasTextDraft | null>(null);
  const [retainedDraft, setRetainedDraft] = useState<CanvasTextDraft | null>(null);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const undeliveredAccepted = useRef<CanvasEditorRender | null>(null);
  const admittedTextTarget = useRef<Pick<
    CanvasTextDraft,
    'frameId' | 'kind' | 'baseRevision'
  > | null>(null);
  const retainDraft = (draft: CanvasTextDraft | null) => {
    textDraft.current = draft;
    admittedTextTarget.current = draft;
    setRetainedDraft(draft);
    owner.current = draft?.frameId ?? null;
    setDraftOwner(draft?.frameId ?? null);
    if (!draft) {
      setRecoveryOpen(false);
    }
  };
  const pendingCommit = useRef(false);
  // Candidate rendering leaves the accepted documents interactive. Only the
  // capture/replacement boundary closes admission and selection.
  const replacingDocuments = useRef(false);
  useEffect(() => {
    activityObserver.current?.({
      manualDraft: !!draftOwner || settingsDirty,
      busy:
        commitPending ||
        refreshing ||
        !!undeliveredAccepted.current ||
        !delivery.current?.allComplete,
      mutationPending: commitPending,
    });
  }, [draftOwner, settingsDirty, commitPending, refreshing, deliveryDiagnostics]);
  const [sourceOpen, setSourceOpen] = useState(false);
  const sourceRestoreFocus = useRef(true);
  const [selection, setSelection] = useState<{
    frameId: string;
    context: BuilderSelectionContext;
    representation: OverviewMode;
    revision: string;
    renderKey: string;
    documentId: string;
    documentInstanceId: string;
  } | null>(null);
  useEffect(() => {
    sourceRestoreFocus.current = false;
    setSourceOpen(false);
  }, [selection]);
  const surfaces = useRef(
    new Map<string, { surface: IframePreviewDocumentSurface; reveal: () => void }>(),
  );
  const sourceFiles = useRef({ ...source.files });
  const session = useRef<{
    client: CanvasDriver;
    deliver: (result: CanvasEditorRender, acceptedAfterMs?: number) => void;
  } | null>(null);
  const view = useRef<CanvasView>({
    camera: { x: 0, y: 0, scale: 1 },
    selectedFrameId: null,
  });
  const editorObservation = useRef<Record<string, unknown>>({});
  editorObservation.current = { selection };
  const contentAction = useRef<
    ((input: CanvasContentSelection, signal?: AbortSignal) => Promise<CanvasEditorRender>) | null
  >(null);
  const postAction = useRef<
    ((input: CanvasPostSelection, signal?: AbortSignal) => Promise<CanvasEditorRender>) | null
  >(null);
  const patchAction = useRef<
    ((patch: CanvasPatch, signal?: AbortSignal) => Promise<CanvasEditorRender>) | null
  >(null);
  const historyAction = useRef<
    ((input: CanvasHistoryRestore, signal?: AbortSignal) => Promise<CanvasEditorRender>) | null
  >(null);
  const publicationAction = useRef<((expectedRevision?: string) => CanvasPublicationReview) | null>(
    null,
  );
  const revealAction = useRef<((frameId: string) => void) | null>(null);
  useEffect(() => {
    const current = new CanvasProbe(frames, source.siteUrl, {
      workspaceId: source.fixture ? undefined : source.id,
      fixture: source.fixture,
    });
    if (source.editor) {
      current.setEditor(
        new CanvasEditorTools({
          workspaceId: source.id,
          readDraft: source.editor.readDraft,
          state: () => ({
            ...source.editor!.state(),
            ...editorObservation.current,
            render: acceptedRender.current
              ? {
                  revision: acceptedRender.current.revision,
                  renderKey: acceptedRender.current.renderKey,
                  dataGeneration: acceptedRender.current.dataGeneration,
                  observation: 'explicit-content-selection',
                  representativePost: acceptedRender.current.representativePost ?? null,
                  representativeContent: acceptedRender.current.representativeContent ?? {},
                  routes: acceptedRender.current.routes ?? source.routes,
                  errorPreview: acceptedRender.current.errorPreview ?? null,
                }
              : null,
            busy:
              busy.current ||
              pendingCommit.current ||
              pendingRefresh.current ||
              refreshUncertain.current ||
              !session.current ||
              !acceptedRender.current ||
              !!undeliveredAccepted.current ||
              !delivery.current?.allComplete,
            settingsDraft: settingsDraft.current,
            manualDraft: textDraft.current
              ? {
                  frameId: textDraft.current.frameId,
                  baseRevision: textDraft.current.baseRevision,
                  marker: textDraft.current.marker,
                  text: textDraft.current.captureFailed ? undefined : textDraft.current.newText,
                  textObservation: textDraft.current.captureFailed
                    ? 'unavailable-copy-from-preview'
                    : 'retained',
                  detached: textDraft.current.detached,
                  conflict: textDraft.current.conflict,
                  captureFailed: !!textDraft.current.captureFailed,
                }
              : owner.current
                ? { frameId: owner.current }
                : null,
          }),
          applyPatch: (patch, signal) => {
            if (!patchAction.current) {
              throw new CanvasRejectedError('The editor is not ready.');
            }
            return patchAction.current(patch, signal);
          },
          validatePatch: (patch, signal) => {
            const client = session.current?.client;
            if (!client?.validateThemePatch) {
              throw new CanvasRejectedError(
                'Patch preflight is unavailable in this editor.',
                'preview_unavailable',
              );
            }
            return client.validateThemePatch(patch, signal);
          },
          listPosts: source.posts?.list,
          contentKinds: source.content
            ? [
                ...(Object.keys(source.content) as CanvasContentKind[]),
                ...(source.posts ? ['post' as const] : []),
              ]
            : undefined,
          listContent: source.content
            ? (kind, page, signal) => {
                const client = session.current?.client;
                if (!client?.listContent) {
                  throw new CanvasRejectedError('Content discovery is unavailable.');
                }
                return client.listContent(kind, page, signal);
              }
            : undefined,
          selectContent: source.content
            ? (input, signal) => {
                if (!contentAction.current) {
                  throw new CanvasRejectedError('The editor is not ready.');
                }
                return contentAction.current(input, signal);
              }
            : undefined,
          revealFrame: (frameId) => {
            if (!revealAction.current) {
              throw new CanvasRejectedError('The canvas is not ready.', 'target_unavailable');
            }
            revealAction.current(frameId);
          },
          openPublicationReview: source.editor.openPublicationReview
            ? (expectedRevision) => {
                if (!publicationAction.current) {
                  throw new CanvasRejectedError('The editor is not ready.');
                }
                return publicationAction.current(expectedRevision);
              }
            : undefined,
          selectPost: source.posts
            ? (input, signal) => {
                if (!postAction.current) {
                  throw new CanvasRejectedError('The editor is not ready.');
                }
                return postAction.current(input, signal);
              }
            : undefined,
          restoreHistory: (input, signal) => {
            if (!historyAction.current) {
              throw new CanvasRejectedError('The editor is not ready.');
            }
            return historyAction.current(input, signal);
          },
        }),
      );
    }
    current.setView(view.current, 'expanded');
    setProbe(current);
    probeObserver.current?.(current);
    // Same-origin hosts may embed Admin. Registrations still belong to the owning
    // page, once per editor, never to the sandboxed theme documents.
    let toolOwner = window.document;
    try {
      toolOwner = window.top?.document ?? toolOwner;
    } catch {
      /* Cross-origin hosting cannot use the parent document. */
    }
    const registration = registerCanvasProbe(toolOwner, current);
    const disposeRelay =
      !source.fixture &&
      source.editor &&
      import.meta.env.DEV &&
      typeof import.meta.env.VITE_CANVAS_RELAY_URL === 'string'
        ? startCanvasRelay(
            toolOwner.defaultView ?? window,
            current,
            import.meta.env.VITE_CANVAS_RELAY_URL,
          )
        : () => {};
    let disposed = false;
    void registration.ready.then((status) => {
      if (!disposed) {
        setSiteTools(status);
      }
    });
    return () => {
      disposed = true;
      disposeRelay();
      registration.dispose();
      probeObserver.current?.(null);
    };
  }, []);
  useEffect(() => {
    probe?.setView(view.current, mode);
  }, [probe, mode]);
  const displayFrames = frames.map((frame) => {
    const displayedMode = mode === 'device' || fallbacks.has(frame.id) ? 'device' : 'expanded';
    const measured = measuredFrameSizes.current.get(frame.id);
    return {
      ...frame,
      viewport: { width: frame.width, height: frame.height },
      height:
        displayedMode === 'expanded' && measured?.width === frame.width
          ? measured.height
          : frame.height,
      overviewLabel: displayedMode === 'expanded' ? 'Live composition' : 'Fixed viewport fallback',
    };
  });
  revealAction.current = (frameId) => {
    const kind = mode === 'device' || fallbacks.has(frameId) ? 'device' : 'expanded';
    const target = surfaces.current.get(`${frameId}:${kind}`);
    if (
      !target ||
      replacingDocuments.current ||
      !delivery.current?.ready.has(`${frameId}:${kind}`)
    ) {
      throw new CanvasRejectedError(
        'The requested live frame is unavailable.',
        'target_unavailable',
      );
    }
    target.reveal();
  };
  useEffect(() => {
    if (!routing.supported) {
      setError(routing.message);
      return;
    }
    const client = source.createDriver();
    let disposed = false;
    let unsubscribe = () => {};
    void Promise.all([client.render(), client.loadAssets()])
      .then(([result, assets]) => {
        if (disposed) {
          return;
        }
        let currentAssets = assets;
        const deliver = (rendered: CanvasEditorRender, acceptedAfterMs = 0) => {
          if (disposed) {
            return;
          }
          setHistory(client.readHistory?.() ?? null);
          if (rendered.unchanged) {
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
          if (rendered.assets) {
            currentAssets = rendered.assets;
          }
          if (rendered.editedFile) {
            sourceFiles.current[rendered.editedFile.path] = rendered.editedFile.content;
          }
          if (textDraft.current) {
            const draft = textDraft.current;
            const compatible = resolveCanvasTextDraft(
              draft,
              sourceFiles.current,
              rendered.inlineTextTargets,
            );
            retainDraft({ ...draft, detached: true, conflict: compatible === null });
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
          const nextRoutes = rendered.routes ?? source.routes;
          setRoutes(nextRoutes);
          if (rendered.representativePost !== undefined) {
            setRepresentativePost(rendered.representativePost);
          }
          if (rendered.representativeContent) {
            setRepresentativeContent(rendered.representativeContent);
          }
          setDocuments(
            Object.fromEntries(
              frames
                .filter((frame) => nextRoutes[frameKind(frame)])
                .map((frame) => {
                  const group = frameKind(frame);
                  return [
                    frame.id,
                    {
                      html: rendered.html[group]!,
                      url: new URL(nextRoutes[group]!, source.siteUrl).href,
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
        unsubscribe = client.subscribe?.(deliver) ?? (() => {});
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
      unsubscribe();
      client.dispose();
    };
  }, [source, routing]);
  const unavailableOverviews =
    mode === 'expanded' ? frames.filter((frame) => expanded[frame.id]?.status === 'failed') : [];
  const boundedExpanded =
    mode === 'expanded' &&
    frames.some((frame) => {
      const state = expanded[frame.id];
      return (
        state?.status === 'current' &&
        (state.composition.status === 'height-limit' || state.composition.status === 'round-limit')
      );
    });
  useEffect(() => {
    const diagnostics = {
      source: { id: source.id, version: source.version, revision, fixture: source.fixture },
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
              configuredViewport: state.composition.configuredViewport,
              frameHeight: state.composition.frameHeight,
              viewportAdjustments: state.composition.viewportAdjustments,
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
    source,
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
    const devicesReady = availableFrames.every((frame) => current.ready.has(`${frame.id}:device`));
    const compositionsReady = availableFrames.every((frame) =>
      current.ready.has(`${frame.id}:expanded`),
    );
    current.allComplete = availableFrames.every((frame) =>
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
      !current.client.refresh ||
      busy.current ||
      !accepted ||
      busy.current ||
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
      const result = await current.client.refresh(accepted);
      current.deliver(result, Math.round(performance.now() - started));
    } catch (failure) {
      if (session.current === current) {
        if (failure instanceof CanvasRejectedError) {
          restoreReads?.();
        } else {
          // Lost transport does not prove that the worker adopted nothing.
          refreshUncertain.current = true;
          setRefreshUnavailable(true);
        }
        setError(
          `${failure instanceof Error ? failure.message : String(failure)}${failure instanceof CanvasRejectedError ? '' : ' Reload Builder to recover.'}`,
        );
      }
    } finally {
      if (session.current === current) {
        pendingRefresh.current = false;
        setRefreshing(false);
      }
    }
  };
  const runEditAction = useCallback(
    async (
      apply: (client: CanvasDriver) => Promise<CanvasEditorRender>,
      signal?: AbortSignal,
    ): Promise<CanvasEditorRender> => {
      const current = session.current;
      if (
        !current ||
        busy.current ||
        !acceptedRender.current ||
        pendingCommit.current ||
        pendingRefresh.current ||
        refreshUncertain.current ||
        undeliveredAccepted.current ||
        (owner.current && !textDraft.current) ||
        !delivery.current?.allComplete
      ) {
        throw new CanvasRejectedError(
          'Finish the current draft or delivery before changing the theme.',
        );
      }
      signal?.throwIfAborted();
      pendingCommit.current = true;
      setCommitPending(true);
      setError(null);
      const restoreReads = probe?.invalidateForRefresh();
      try {
        const result = await apply(current.client);
        replacingDocuments.current = !result.unchanged;
        const target = textDraft.current ?? admittedTextTarget.current;
        if (!result.unchanged && target && !textDraft.current?.detached) {
          try {
            const surface = surfaces.current.get(`${target.frameId}:${target.kind}`)?.surface;
            if (!surface) {
              throw new Error('The text preview is unavailable.');
            }
            // A request admitted while the candidate rendered may still be
            // pending. Retire admission before capturing any editor it created.
            const preservationSignal = new AbortController().signal;
            await surface.cancelPendingInlineTextEdit(preservationSignal);
            const captured = await surface.freezeInlineTextDraft(preservationSignal);
            const draft = textDraft.current;
            const marker = captured && parseEditMarker(captured.marker);
            retainDraft(
              captured
                ? {
                    ...(draft ?? {
                      ...target,
                      sourceFile: marker ? sourceFiles.current[marker.file] : '',
                      detached: false,
                      conflict: false,
                    }),
                    ...captured,
                  }
                : null,
            );
          } catch {
            // Source is already accepted. Keep the old live document/text until
            // the person copies or cancels it; never claim the write was rejected.
            undeliveredAccepted.current = result;
            if (textDraft.current) {
              retainDraft({ ...textDraft.current, captureFailed: true });
            }
            setError(
              'The theme changed. Copy your text directly from the retained preview, then cancel the draft to show the accepted theme.',
            );
            return result;
          }
        }
        current.deliver(result);
        if (result.unchanged) {
          restoreReads?.();
        }
        return result;
      } catch (failure) {
        if (session.current === current) {
          if (failure instanceof CanvasRejectedError) {
            restoreReads?.();
          } else {
            refreshUncertain.current = true;
            setRefreshUnavailable(true);
          }
          setError(
            `${failure instanceof Error ? failure.message : String(failure)}${failure instanceof CanvasRejectedError ? '' : ' Reload Builder to recover.'}`,
          );
        }
        throw failure;
      } finally {
        if (session.current === current) {
          replacingDocuments.current = false;
          pendingCommit.current = false;
          setCommitPending(false);
        }
      }
    },
    [probe],
  );
  const selectPost = (input: CanvasPostSelection, signal?: AbortSignal) =>
    runEditAction((client) => {
      if (!client.selectPost) {
        throw new CanvasRejectedError('Post selection is unavailable.');
      }
      return client.selectPost(input, signal);
    }, signal);
  postAction.current = selectPost;
  const selectContent = (input: CanvasContentSelection, signal?: AbortSignal) =>
    runEditAction((client) => {
      if (!client.selectContent) {
        throw new CanvasRejectedError('Content selection is unavailable.');
      }
      return client.selectContent(input, signal);
    }, signal);
  contentAction.current = selectContent;
  const applyThemePatch = useCallback(
    (patch: CanvasPatch, signal?: AbortSignal) =>
      runEditAction((client) => client.applyThemePatch(patch, signal), signal),
    [runEditAction],
  );
  const restoreHistory = useCallback(
    (input: CanvasHistoryRestore, signal?: AbortSignal) =>
      runEditAction((client) => {
        if (!client.restoreHistory) {
          throw new CanvasRejectedError('History is unavailable in this editor.');
        }
        return client.restoreHistory(input, signal);
      }, signal),
    [runEditAction],
  );
  const restoreCheckpoint = (checkpointId: string | null) => {
    const render = acceptedRender.current;
    if (!checkpointId || !render) {
      return;
    }
    void restoreHistory({
      checkpointId,
      expectedRevision: render.revision,
      expectedDataGeneration: render.dataGeneration,
    }).catch(() => {});
  };
  patchAction.current = applyThemePatch;
  historyAction.current = restoreHistory;
  const openPublicationReview = (expectedRevision?: string): CanvasPublicationReview => {
    if (
      !source.editor?.readPublicationReview ||
      !source.editor.openPublicationReview ||
      !session.current ||
      !acceptedRender.current ||
      busy.current ||
      pendingCommit.current ||
      pendingRefresh.current ||
      refreshUncertain.current ||
      undeliveredAccepted.current ||
      !delivery.current?.allComplete
    ) {
      throw new CanvasRejectedError(
        'Wait for the current theme operation before reviewing publication.',
      );
    }
    const summary = source.editor.readPublicationReview();
    if (expectedRevision !== undefined && expectedRevision !== summary.revision) {
      throw new CanvasRejectedError(
        'Read the latest revision before reviewing publication.',
        'stale_revision',
      );
    }
    if (!source.editor.state().dirty) {
      throw new CanvasRejectedError(
        'There are no accepted theme changes to publish.',
        'no_changes',
      );
    }
    const review = {
      ...summary,
      pending: { text: !!owner.current || !!textDraft.current, settings: !!settingsDraft.current },
    };
    source.editor.openPublicationReview(review);
    return review;
  };
  publicationAction.current = openPublicationReview;
  const publishTheme = async (options: CanvasPublishOptions): Promise<CanvasPublishResult> => {
    let outcome: CanvasPublishResult | undefined;
    try {
      await runEditAction(async (client) => {
        if (!client.publish) {
          throw new CanvasRejectedError('Publication is unavailable.');
        }
        outcome = await client.publish(new AbortController().signal, options);
        if (!outcome.ok) {
          throw new CanvasRejectedError(outcome.error.message, outcome.error.code);
        }
        if (!outcome.render) {
          // Server success is authoritative. Preserve the old document/text and
          // retire its evidence; a refresh failure must never look like rejection.
          throw new Error(
            outcome.previewWarning ?? 'The theme was published, but its preview could not refresh.',
          );
        }
        return outcome.render;
      });
    } catch (failure) {
      if (!outcome) {
        throw failure;
      }
    }
    return outcome!;
  };
  const resumeTextDraft = async () => {
    const draft = textDraft.current;
    const render = acceptedRender.current;
    if (
      !draft ||
      !render ||
      undeliveredAccepted.current ||
      pendingCommit.current ||
      !delivery.current?.allComplete
    ) {
      return;
    }
    const marker = resolveCanvasTextDraft(draft, sourceFiles.current, render.inlineTextTargets);
    const parsed = marker && parseEditMarker(marker);
    const target = surfaces.current.get(`${draft.frameId}:${draft.kind}`);
    if (!marker || !parsed || !target) {
      retainDraft({ ...draft, detached: true, conflict: true });
      return;
    }
    const resumed = {
      ...draft,
      marker,
      baseRevision: render.revision,
      sourceFile: sourceFiles.current[parsed.file],
      detached: false,
      conflict: false,
    };
    try {
      target.reveal();
      retainDraft(resumed);
      await target.surface.resumeInlineTextDraft(resumed, new AbortController().signal);
    } catch (failure) {
      retainDraft({ ...draft, detached: true, conflict: true });
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  };
  const cancelTextDraft = async () => {
    const draft = textDraft.current;
    try {
      const frameId = draft?.frameId ?? owner.current;
      const kind =
        draft?.kind ??
        (mode === 'device' || (frameId && fallbacks.has(frameId)) ? 'device' : 'expanded');
      if (frameId && !draft?.detached && !undeliveredAccepted.current) {
        await surfaces.current
          .get(`${frameId}:${kind}`)
          ?.surface.cancelInlineTextEdit(new AbortController().signal);
      }
      retainDraft(null);
      setError(null);
      const pending = undeliveredAccepted.current;
      undeliveredAccepted.current = null;
      if (pending) {
        session.current?.deliver(pending);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  };
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
      busy.current ||
      pendingRefresh.current ||
      refreshUncertain.current ||
      !delivery.current?.allComplete ||
      acceptedRender.current?.renderKey !== document.renderKey
    ) {
      return {
        ok: false,
        message:
          'Wait for the current render to finish before committing text. Reload Builder if refresh was interrupted.',
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
      retainDraft(null);
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
      {/* Responsive action groups unmount their desktop children at narrow widths. */}
      {!source.fixture && source.editor && probe && <CanvasAgentConnection probe={probe} />}
      <Box className="shrink-0 border-b border-border-default bg-background px-4 py-2">
        <PageHeader blurredBackground={false} sticky={false}>
          <PageHeader.Left className="min-w-0 shrink-0">
            <Inline align="center" gap="sm">
              {headerLeading}
              <PageHeader.Title className="truncate text-base">
                Canvas
                <span className="hidden sm:inline">
                  {' '}
                  · {source.editor?.readDraft().theme.name ?? source.label}
                </span>
              </PageHeader.Title>
            </Inline>
          </PageHeader.Left>
          <PageHeader.Actions className="min-w-0 shrink flex-wrap justify-end">
            <Box ref={setZoomControlsHost} />
            <PageHeader.ActionGroup>
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
                          const selectedSource = (
                            selection.context.data as
                              | { source?: { path: string; line: number } }
                              | undefined
                          )?.source;
                          return selectedSource
                            ? sourceFiles.current[selectedSource.path]
                                ?.split('\n')
                                .slice(
                                  Math.max(0, selectedSource.line - 2),
                                  selectedSource.line + 2,
                                )
                                .join('\n')
                            : 'Source correspondence unavailable.';
                        })()}
                      </pre>
                    </Stack>
                  )}
                </PopoverContent>
              </Popover>
              {source.posts && (
                <CanvasPostPicker
                  busy={
                    externalBusy ||
                    commitPending ||
                    refreshing ||
                    !!undeliveredAccepted.current ||
                    !delivery.current?.allComplete
                  }
                  dataGeneration={renderState.dataGeneration}
                  list={source.posts.list}
                  revision={revision}
                  select={selectPost}
                  selected={representativePost}
                />
              )}
              {source.editor && (
                <CanvasDesignSettings
                  apply={applyThemePatch}
                  busy={
                    externalBusy ||
                    commitPending ||
                    refreshing ||
                    !!undeliveredAccepted.current ||
                    !delivery.current?.allComplete
                  }
                  dataGeneration={renderState.dataGeneration}
                  readDraft={source.editor.readDraft}
                  revision={revision}
                  onDraftChange={observeSettingsDraft}
                />
              )}
              <PageHeader.ActionGroup>
                {history && (
                  <>
                    <PageHeader.Action
                      disabled={
                        !history.undoId ||
                        externalBusy ||
                        !!draftOwner ||
                        commitPending ||
                        refreshing ||
                        refreshUnavailable ||
                        !delivery.current?.allComplete
                      }
                      label="Undo theme change"
                      iconOnly
                      onClick={() => restoreCheckpoint(history.undoId)}
                    >
                      <LucideIcon.Undo2 />
                    </PageHeader.Action>
                    <PageHeader.Action
                      disabled={
                        !history.redoId ||
                        externalBusy ||
                        !!draftOwner ||
                        commitPending ||
                        refreshing ||
                        refreshUnavailable ||
                        !delivery.current?.allComplete
                      }
                      label="Redo theme change"
                      iconOnly
                      onClick={() => restoreCheckpoint(history.redoId)}
                    >
                      <LucideIcon.Redo2 />
                    </PageHeader.Action>
                  </>
                )}
                <PageHeader.ActionGroup.MobileMenu>
                  <PageHeader.ActionGroup.MobileMenuTrigger>
                    <PageHeader.Action label="Canvas views" iconOnly>
                      <LucideIcon.Ellipsis />
                    </PageHeader.Action>
                  </PageHeader.ActionGroup.MobileMenuTrigger>
                  <PageHeader.ActionGroup.MobileMenuContent className="z-[60]">
                    {history && (
                      <>
                        <DropdownMenuItem
                          disabled={
                            !history.undoId ||
                            externalBusy ||
                            !!draftOwner ||
                            commitPending ||
                            refreshing ||
                            refreshUnavailable ||
                            !delivery.current?.allComplete
                          }
                          onSelect={() => restoreCheckpoint(history.undoId)}
                        >
                          <LucideIcon.Undo2 />
                          Undo theme change
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={
                            !history.redoId ||
                            externalBusy ||
                            !!draftOwner ||
                            commitPending ||
                            refreshing ||
                            refreshUnavailable ||
                            !delivery.current?.allComplete
                          }
                          onSelect={() => restoreCheckpoint(history.redoId)}
                        >
                          <LucideIcon.Redo2 />
                          Redo theme change
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem disabled={!!draftOwner} onSelect={() => setMode('expanded')}>
                      <LucideIcon.Layers />
                      Full page
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={!!draftOwner} onSelect={() => setMode('device')}>
                      <LucideIcon.Monitor />
                      Device
                    </DropdownMenuItem>
                    {source.refreshLabel && (
                      <DropdownMenuItem
                        disabled={
                          externalBusy ||
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
                        {source.refreshLabel?.(renderState.dataSnapshot)}
                      </DropdownMenuItem>
                    )}
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
                {source.refreshLabel && (
                  <PageHeader.Action
                    disabled={
                      externalBusy ||
                      !!draftOwner ||
                      commitPending ||
                      refreshing ||
                      refreshUnavailable ||
                      !delivery.current?.allComplete
                    }
                    label={source.refreshLabel?.(renderState.dataSnapshot)}
                    onClick={() => {
                      void refreshContent();
                    }}
                  >
                    <LucideIcon.RefreshCw />
                    {refreshing
                      ? 'Refreshing…'
                      : source.refreshLabel?.(renderState.dataSnapshot) ===
                          'Restore recorded content'
                        ? 'Restore content'
                        : 'Refresh content'}
                  </PageHeader.Action>
                )}
              </PageHeader.ActionGroup>
              {headerActions && (
                <PageHeader.ActionGroup.Primary>
                  {typeof headerActions === 'function'
                    ? headerActions({ openReview: openPublicationReview, publish: publishTheme })
                    : headerActions}
                </PageHeader.ActionGroup.Primary>
              )}
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
              {commitPending
                ? 'Applying theme change…'
                : retainedDraft?.conflict
                  ? 'The theme text changed. Your draft is preserved.'
                  : 'A text draft is retained.'}
            </Text>
            <Button
              disabled={
                commitPending ||
                !!retainedDraft?.conflict ||
                !!undeliveredAccepted.current ||
                !delivery.current?.allComplete
              }
              size="sm"
              variant="outline"
              onClick={() => {
                void resumeTextDraft();
              }}
            >
              Resume text draft
            </Button>
            {retainedDraft && (
              <Popover open={recoveryOpen} onOpenChange={setRecoveryOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline">
                    Recover text draft
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <Stack gap="sm">
                    <Text size="sm">Your text is separate from the accepted theme.</Text>
                    {retainedDraft.captureFailed ? (
                      <Text size="sm">
                        Copy the complete text directly from the retained preview, then cancel the
                        draft to show the accepted theme.
                      </Text>
                    ) : (
                      <>
                        <Textarea
                          aria-label="Preserved text draft"
                          value={retainedDraft.newText}
                          readOnly
                        />
                        <Text size="xs">Original text: {retainedDraft.baseText}</Text>
                      </>
                    )}
                    {retainedDraft.detached && (
                      <Text size="xs">
                        The canvas shows the current accepted theme; this draft is not included.
                      </Text>
                    )}
                    {!retainedDraft.captureFailed && (
                      <Button
                        size="sm"
                        onClick={() => {
                          void navigator.clipboard
                            .writeText(retainedDraft.newText)
                            .catch(() =>
                              setError('Select the preserved text and copy it with your keyboard.'),
                            );
                        }}
                      >
                        Copy draft text
                      </Button>
                    )}
                  </Stack>
                </PopoverContent>
              </Popover>
            )}
            <Button
              disabled={commitPending}
              size="sm"
              variant="ghost"
              onClick={() => {
                void cancelTextDraft();
              }}
            >
              Cancel text draft
            </Button>
          </Inline>
        )}
        {(error || externalNotice) && (
          <Text className="text-destructive" role="alert">
            {error || externalNotice}
          </Text>
        )}
        {!routing.supported && (
          <Button variant="link" asChild>
            <a href={source.siteUrl} rel="noopener noreferrer" target="_blank">
              Open site preview
            </a>
          </Button>
        )}
      </Box>
      <Box className="min-h-0 flex-1">
        <CanvasBoard
          frames={displayFrames}
          renderControls={(controls) =>
            zoomControlsHost ? createPortal(controls, zoomControlsHost) : null
          }
          renderFrame={(frame, onInput, { reveal, select }) =>
            documents[frame.id] && probe ? (
              <>
                {(['device', 'expanded'] as const).map((kind) => (
                  <LivePreview
                    key={kind}
                    document={documents[frame.id]}
                    draftOwner={retainedDraft?.detached ? null : draftOwner}
                    frame={frame}
                    kind={kind}
                    probe={probe}
                    reveal={reveal}
                    visible={
                      (mode === 'device' || fallbacks.has(frame.id) ? 'device' : 'expanded') ===
                      kind
                    }
                    onAdmission={(interactionTime) => {
                      if (
                        busy.current ||
                        pendingRefresh.current ||
                        replacingDocuments.current ||
                        refreshUncertain.current ||
                        !!undeliveredAccepted.current ||
                        textDraft.current?.detached ||
                        !delivery.current?.allComplete ||
                        !delivery.current?.ready.has(`${frame.id}:${kind}`) ||
                        interactionTime < latestInteractionIntent.current ||
                        (owner.current && owner.current !== frame.id)
                      ) {
                        return false;
                      }
                      latestInteractionIntent.current = interactionTime;
                      admittedTextTarget.current = {
                        frameId: frame.id,
                        kind,
                        baseRevision: documents[frame.id].revision,
                      };
                      owner.current = frame.id;
                      setDraftOwner(frame.id);
                      return true;
                    }}
                    onDelivery={surfaceDelivered}
                    onEdit={(edit, document, signal) => editText(frame.id, edit, document, signal)}
                    onExpanded={(state) => {
                      if (state.status === 'current') {
                        measuredFrameSizes.current.set(frame.id, {
                          width: state.composition.configuredViewport.width,
                          height: state.composition.frameHeight,
                        });
                      }
                      setExpanded((current) => ({ ...current, [frame.id]: state }));
                    }}
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
                        if (input.draft && (!owner.current || owner.current === frame.id)) {
                          const original = textDraft.current;
                          const marker = parseEditMarker(input.draft.marker);
                          retainDraft(
                            original
                              ? { ...original, newText: input.draft.newText }
                              : {
                                  ...input.draft,
                                  frameId: frame.id,
                                  kind,
                                  baseRevision: documents[frame.id].revision,
                                  sourceFile: marker ? sourceFiles.current[marker.file] : '',
                                  detached: false,
                                  conflict: false,
                                },
                          );
                        } else if (input.box && (!owner.current || owner.current === frame.id)) {
                          owner.current = frame.id;
                          setDraftOwner(frame.id);
                        } else if (!input.box && owner.current === frame.id) {
                          if ((input.retired || textDraft.current?.detached) && textDraft.current) {
                            retainDraft({ ...textDraft.current, detached: true });
                          } else {
                            retainDraft(null);
                          }
                        }
                      }
                      onInput(input);
                    }}
                    onSelection={(id, context, interactionTime) => {
                      if (
                        busy.current ||
                        pendingRefresh.current ||
                        replacingDocuments.current ||
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
                      const target = probe.target(id, kind);
                      setSelection(
                        context && target?.documentId && target.documentInstanceId
                          ? {
                              frameId: id,
                              context,
                              representation: kind,
                              revision: documents[frame.id].revision,
                              renderKey:
                                documents[frame.id].renderKey ?? documents[frame.id].revision,
                              documentId: target.documentId,
                              documentInstanceId: target.documentInstanceId,
                            }
                          : null,
                      );
                    }}
                    onSurface={(id, surface, revealCurrentFrame) => {
                      if (surface) {
                        surfaces.current.set(id, { surface, reveal: revealCurrentFrame });
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
            ) : !routes[frameKind(frame)] ? (
              <Text>
                {frameKind(frame) === 'error'
                  ? 'This theme has no custom 404 template.'
                  : (frameKind(frame) !== 'home' &&
                      source.content?.[frameKind(frame) as CanvasContentKind]?.unavailableReason) ||
                    `No published ${frame.group} is available.`}
              </Text>
            ) : null
          }
          renderFrameActions={(frame) => {
            const device = mode === 'device' || fallbacks.has(frame.id);
            const state = expanded[frame.id];
            const warning =
              state?.status === 'failed'
                ? 'Full page unavailable. Use fixed viewport.'
                : state?.status === 'current' &&
                    (state.composition.status === 'height-limit' ||
                      state.composition.status === 'round-limit')
                  ? 'Full page reached a layout limit. Use fixed viewport.'
                  : null;
            const kind = frameKind(frame);
            const provider =
              kind === 'home' || kind === 'error' ? undefined : source.content?.[kind];
            return (
              <Inline gap="xs">
                {provider && kind !== 'home' && kind !== 'error' && (
                  <CanvasPostPicker
                    busy={
                      externalBusy ||
                      commitPending ||
                      refreshing ||
                      !!undeliveredAccepted.current ||
                      !delivery.current?.allComplete
                    }
                    dataGeneration={renderState.dataGeneration}
                    kind={canvasContentLabels[kind]}
                    list={provider.list}
                    revision={revision}
                    select={(input, signal) => selectContent({ ...input, kind }, signal)}
                    selected={representativeContent[kind] ?? null}
                  />
                )}
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
                    for (const representation of ['device', 'expanded']) {
                      void surfaces.current
                        .get(`${frame.id}:${representation}`)
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
              </Inline>
            );
          }}
          onSelectionIntent={() => {
            setSelection(null);
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
