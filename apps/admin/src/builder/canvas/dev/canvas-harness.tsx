import { useEffect, useRef, useState } from 'react';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { PageHeader } from '@tryghost/shade/patterns';
import { Button, DropdownMenuItem } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';

import { CanvasBoard } from '@/builder/canvas/canvas-board';
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
import type { ExpandedComposition } from '@/builder/canvas/measure-expanded-composition';
import type { ProbeRegistrationStatus } from './webmcp-probe';
import type { ThemeFixtureId } from './fixture';

type ExpandedState =
  | { status: 'pending' }
  | { status: 'current'; composition: ExpandedComposition; surfaceId: string; duration: number }
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
}: {
  frame: CanvasFrame;
  document: PreviewDocument;
  kind: OverviewMode;
  visible: boolean;
  draftOwner: string | null;
  onInput: (input: CanvasFrameInput) => void;
  onExpanded: (state: ExpandedState) => void;
  probe: CanvasProbe;
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
  const handlers = useRef({
    onInput,
    onExpanded,
    onSurface,
    onSelection,
    onEdit,
    onAdmission,
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
      admitInlineTextEdit: (interactionTime) =>
        handlers.current.visible && handlers.current.onAdmission(interactionTime),
      captureLoadedImages: true,
    });
    current.onCanvasInput((input) => {
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
    setStatus('Loading preview…');
    iframe.current!.style.height = `${height}px`;
    const connection = kind === 'device' ? probe.attach(frame.id, surface, document) : null;
    const removeEdit = surface.onInlineEdit((edit, signal) =>
      handlers.current.onEdit(edit, document, signal),
    );
    const started = performance.now();
    if (kind === 'expanded') {
      handlers.current.onExpanded({ status: 'pending' });
    }
    void surface
      .setInteractionMode('select', controller.signal)
      .then(() => surface.replaceDocument(document, null, controller.signal))
      .then(async () => {
        if (kind === 'expanded') {
          const result = await measureExpandedComposition(
            surface,
            (next, signal) => {
              iframe.current!.style.height = `${next}px`;
              return waitForCompositionLayout(signal);
            },
            frame.id,
            document.revision,
            controller.signal,
          );
          if (!controller.signal.aborted) {
            setComposition(result);
            handlers.current.onExpanded({
              status: 'current',
              composition: result,
              surfaceId,
              duration: performance.now() - started,
            });
          }
        } else {
          await connection!.ready();
        }
        const mode =
          handlers.current.visible &&
          (!handlers.current.draftOwner || handlers.current.draftOwner === frame.id)
            ? 'edit'
            : 'select';
        await surface.setInteractionMode(mode, controller.signal);
        if (!controller.signal.aborted) {
          lastMode.current = { document, mode };
          setReady(document);
          setStatus('Ready');
        }
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          connection?.fail();
          const message = failure instanceof Error ? failure.message : String(failure);
          setStatus(message);
          if (kind === 'expanded') {
            handlers.current.onExpanded({ status: 'failed', message });
          }
        }
      });
    return () => {
      controller.abort();
      connection?.dispose();
      removeEdit();
    };
  }, [surface, document, frame.id, kind, width, height, surfaceId, probe]);
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
        data-composition-status={
          kind === 'expanded' ? (composition?.status ?? 'pending') : undefined
        }
        data-composition-surface={kind === 'expanded' ? surfaceId : undefined}
        data-fixture-revision={kind === 'device' ? ready?.revision : undefined}
        data-preview-status={status}
        style={{
          width,
          height: kind === 'expanded' && composition ? composition.viewport.height : height,
        }}
        title={`${frame.label} ${kind === 'expanded' ? 'composition' : 'preview'}`}
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
}: {
  fixtureId?: ThemeFixtureId;
  onDeviceSurface?: (id: string, surface: IframePreviewDocumentSurface | null) => void;
  onCompositionSurface?: (id: string, surface: IframePreviewDocumentSurface | null) => void;
}) {
  // A fixture is selected once per harness mount.
  const [fixture] = useState(() => getThemeFixture(fixtureId));
  const [revision, setRevision] = useState(fixture.revision);
  const [documents, setDocuments] = useState<Record<string, PreviewDocument>>({});
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, ExpandedState>>({});
  const [mode, setMode] = useState<OverviewMode>('expanded');
  const [probe, setProbe] = useState<CanvasProbe | null>(null);
  const [siteTools, setSiteTools] = useState<ProbeRegistrationStatus | 'pending'>('pending');
  const [draftOwner, setDraftOwner] = useState<string | null>(null);
  const owner = useRef<string | null>(null);
  const latestInteractionIntent = useRef(0);
  const iframeInteractionTime = useRef<number | null>(null);
  const [commitPending, setCommitPending] = useState(false);
  const pendingCommit = useRef(false);
  const [selection, setSelection] = useState<{
    frameId: string;
    context: BuilderSelectionContext;
  } | null>(null);
  const surfaces = useRef(
    new Map<string, { surface: IframePreviewDocumentSurface; reveal: () => void }>(),
  );
  const sourceFiles = useRef({ ...fixture.theme });
  const session = useRef<{
    client: FixtureClient;
    deliver: (result: FixtureRender) => void;
  } | null>(null);
  const view = useRef<CanvasView>({
    camera: { x: 0, y: 0, scale: 1 },
    selectedFrameId: null,
  });
  useEffect(() => {
    const current = new CanvasProbe(frames, instance.siteUrl);
    current.setView(view.current, 'expanded');
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
  const initialFitReady = frames.every(
    (frame) => expanded[frame.id]?.status === 'current' || expanded[frame.id]?.status === 'failed',
  );
  const displayFrames = frames.map((frame) => {
    const state = expanded[frame.id];
    const composition =
      state?.status === 'current' && state.composition.revision === documents[frame.id]?.revision
        ? state.composition
        : null;
    return {
      ...frame,
      viewport: { width: frame.width, height: frame.height },
      height: mode === 'expanded' && composition ? composition.viewport.height : frame.height,
      overviewLabel: mode === 'expanded' ? 'Live composition' : 'Fixed viewport',
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
      siteTools,
      compositions: frames.map((frame) => {
        const state = expanded[frame.id];
        return state?.status === 'current'
          ? {
              frameId: frame.id,
              status: state.status,
              revision: state.composition.revision,
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
  }, [fixture, revision, siteTools, expanded, probe]);
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
      <Box className="shrink-0 border-b border-border-default bg-background px-4 py-2">
        <PageHeader blurredBackground={false} sticky={false}>
          <PageHeader.Left>
            <PageHeader.Title className="text-base">Canvas · {fixture.label}</PageHeader.Title>
          </PageHeader.Left>
          <PageHeader.Actions>
            <PageHeader.ActionGroup>
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
                </PageHeader.ActionGroup.MobileMenuContent>
              </PageHeader.ActionGroup.MobileMenu>
            </PageHeader.ActionGroup>
          </PageHeader.Actions>
        </PageHeader>
        {unavailableOverviews.length > 0 && (
          <Text role="status" size="xs">
            Full page unavailable for {unavailableOverviews.map((frame) => frame.label).join(', ')}.
            Choose Device for the fixed viewport fallback.
          </Text>
        )}
        {boundedExpanded && (
          <Text role="status" size="xs">
            Live pages reached a layout limit. Choose Device for fixed viewports.
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
              onClick={() => surfaces.current.get(`${draftOwner}:${mode}`)?.reveal()}
            >
              Resume text draft
            </Button>
            <Button
              disabled={commitPending}
              size="sm"
              variant="ghost"
              onClick={() => {
                const current = surfaces.current.get(`${draftOwner}:${mode}`);
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
        {selection && (
          <Stack gap="xs">
            <Text size="sm">
              {frames.find((frame) => frame.id === selection.frameId)?.label}:{' '}
              {selection.context.label}
            </Text>
            <details data-source-selection>
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
                    visible={mode === kind}
                    onAdmission={(interactionTime) => {
                      if (
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
          onSelectionIntent={() => {
            latestInteractionIntent.current =
              iframeInteractionTime.current ?? performance.timeOrigin + performance.now();
            if (owner.current) {
              void surfaces.current
                .get(`${owner.current}:${mode}`)
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
