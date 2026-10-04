import { SCREENSHOT_LIMITS } from '@/builder/workspaces/theme/preview/screenshot';
import { CompositionGeometryChange } from './measure-expanded-composition';
import type { CanvasEditorTools } from './canvas-editor-tools';

import type { CanvasView } from '@/builder/canvas/canvas-board';
import type {
  IframePreviewDocumentSurface,
  PreviewDocument,
  PreviewLayout,
} from '@/builder/workspaces/theme/preview/preview-document';
import type { ScreenshotRequest } from '@/builder/workspaces/theme/preview/screenshot';

export type CanvasProbeSurface = Pick<
  IframePreviewDocumentSurface,
  'measureLayout' | 'inspectPage' | 'screenshot' | 'inspectElement'
>;
type FrameDescriptor = { id: string; label: string; group: string; width: number; height: number };
export type ReadResult =
  | { status: 'ok'; data: Record<string, unknown> }
  | { status: 'error'; code: string; message: string; details?: unknown };
type ReadFailure = Extract<ReadResult, { status: 'error' }>;
export type ProbeTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; untrustedContentHint: true };
  execute: (input: unknown, options?: { signal?: AbortSignal }) => Promise<ReadResult>;
};
type ModelContext = {
  registerTool: (tool: ProbeTool, options: { signal: AbortSignal }) => void | Promise<void>;
};
export type ProbeRegistrationStatus = 'unsupported' | 'registered' | 'failed';

class ReadError extends Error {
  readonly code: string;
  readonly details?: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}
type Representation = 'device' | 'expanded';
type Entry = {
  representation: Representation;
  surface: CanvasProbeSurface;
  document: PreviewDocument;
  representationHandle: string;
  lifetime: AbortController;
  status: 'pending' | 'current' | 'failed' | 'stale';
  failure?: Omit<ReadFailure, 'status'>;
  documentId?: string;
  documentInstanceId?: string;
  refreshEpoch?: number;
};
type Frame = {
  descriptor: FrameDescriptor;
  frameHandle: string;
  entries: Partial<Record<Representation, Entry>>;
};
const targetProperties = {
  workspaceId: { type: 'string', maxLength: 256 },
  frameHandle: { type: 'string', maxLength: 256 },
  representationHandle: { type: 'string', maxLength: 256 },
  expectedRevision: { type: 'string', maxLength: 256 },
  expectedRenderKey: { type: 'string', maxLength: 256 },
};
const targetKeys = Object.keys(targetProperties);

function argumentsObject(input: unknown, allowed: string[]) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => !allowed.includes(key))
  ) {
    throw new ReadError('invalid_arguments', 'Arguments must match the discovered tool schema.');
  }
  return input as Record<string, unknown>;
}
function stringArgument(args: Record<string, unknown>, key: string) {
  const value = args[key];
  if (typeof value !== 'string' || !value.length || value.length > 256) {
    throw new ReadError('invalid_arguments', `A bounded ${key} string is required.`);
  }
  return value;
}
function sameLayout(first: PreviewLayout, next: PreviewLayout) {
  return (
    first.documentId === next.documentId &&
    first.documentInstanceId === next.documentInstanceId &&
    first.localEdits.generation === next.localEdits.generation &&
    first.localEdits.active === next.localEdits.active &&
    first.localEdits.changed === next.localEdits.changed &&
    first.viewport.width === next.viewport.width &&
    first.viewport.height === next.viewport.height &&
    first.viewport.scrollX === next.viewport.scrollX &&
    first.viewport.scrollY === next.viewport.scrollY &&
    first.document.width === next.document.width &&
    first.document.height === next.document.height
  );
}

/** Addressed read-only preview registry. Source mutations belong to the editor. */
export class CanvasProbe {
  readonly workspaceId: string;
  private readonly lifetime = new AbortController();
  private readonly frames = new Map<string, Frame>();
  private captureBusy = false;
  private refreshEpoch = 0;
  private view: CanvasView = {
    camera: { x: 0, y: 0, scale: 1 },
    selectedFrameId: null,
  };
  private mode = 'expanded';
  private diagnostics: Record<string, unknown> = {};
  private readonly siteUrl: string;
  private readonly fixture: boolean;
  private editor?: CanvasEditorTools;

  constructor(
    descriptors: readonly FrameDescriptor[],
    siteUrl: string,
    options: { workspaceId?: string; fixture?: boolean } = {},
  ) {
    this.siteUrl = siteUrl;
    this.workspaceId = options.workspaceId ?? crypto.randomUUID();
    this.fixture = options.fixture ?? true;
    if (
      descriptors.length > 12 ||
      new Set(descriptors.map((frame) => frame.id)).size !== descriptors.length
    ) {
      throw new Error('The canvas probe requires at most twelve uniquely identified frames.');
    }
    for (const descriptor of descriptors) {
      this.frames.set(descriptor.id, {
        descriptor: { ...descriptor },
        frameHandle: crypto.randomUUID(),
        entries: {},
      });
    }
  }

  setView(view: CanvasView, mode: string) {
    this.view = { ...view, camera: { ...view.camera } };
    this.mode = mode;
  }

  setDiagnostics(diagnostics: Record<string, unknown>) {
    this.diagnostics = structuredClone(diagnostics);
  }

  setEditor(editor: CanvasEditorTools) {
    this.editor = editor;
  }

  target(frameId: string, representation: Representation) {
    const frame = this.frames.get(frameId);
    const entry = frame?.entries[representation];
    return frame && entry
      ? {
          workspaceId: this.workspaceId,
          frameHandle: frame.frameHandle,
          representationHandle: entry.representationHandle,
          expectedRevision: entry.document.revision,
          expectedRenderKey: entry.document.renderKey ?? entry.document.revision,
          documentId: entry.documentId,
          documentInstanceId: entry.documentInstanceId,
        }
      : null;
  }

  state() {
    const editor = this.editor?.state() ?? null;
    const selected = editor?.selection as
      | {
          frameId: string;
          representation: Representation;
          revision: string;
          renderKey: string;
          documentId: string;
          documentInstanceId: string;
        }
      | null
      | undefined;
    if (editor && selected) {
      const target = this.target(selected.frameId, selected.representation);
      editor.selection = {
        ...selected,
        target:
          target &&
          target.expectedRevision === selected.revision &&
          target.expectedRenderKey === selected.renderKey &&
          target.documentId === selected.documentId &&
          target.documentInstanceId === selected.documentInstanceId
            ? target
            : null,
      };
    }
    const description = (entry: Entry) => ({
      representationHandle: entry.representationHandle,
      status: entry.status,
      revision: entry.document.revision,
      renderKey: entry.document.renderKey ?? entry.document.revision,
      dataGeneration: entry.document.dataGeneration ?? 0,
      documentId: entry.documentId ?? null,
      documentInstanceId: entry.documentInstanceId ?? null,
      ...(entry.failure ? { failure: structuredClone(entry.failure) } : {}),
    });
    return {
      protocolVersion: this.fixture ? 'canvas-fixture-probe-3' : 'canvas-editor-probe-1',
      workspaceId: this.workspaceId,
      siteUrl: this.siteUrl,
      fixture: this.fixture,
      editor,
      diagnostics: structuredClone(this.diagnostics),
      capabilities: {
        readOnly: !this.editor,
        mutations: !!this.editor,
        themeReads: !!this.editor,
        history: this.editor?.historyAvailable ?? false,
        publication: false,
        representations: ['device', 'expanded'],
        elementInspection: true,
        captureRepresentations: ['device'],
        captureFormat: 'png-data-url-experiment',
        nativeImageConsumption: 'unverified',
        revisionProvenance: 'rendered-document-only',
        localEditPolicy: 'refuse-certified-read',
      },
      view: { ...this.view, camera: { ...this.view.camera }, mode: this.mode },
      frames: [...this.frames.values()].map((frame) => ({
        ...frame.descriptor,
        frameHandle: frame.frameHandle,
        device: frame.entries.device
          ? {
              ...description(frame.entries.device),
              viewport: { width: frame.descriptor.width, height: frame.descriptor.height },
            }
          : null,
        expanded: frame.entries.expanded ? description(frame.entries.expanded) : null,
      })),
    };
  }

  attach(
    frameId: string,
    surface: CanvasProbeSurface,
    document: PreviewDocument,
    representation: Representation = 'device',
  ) {
    this.assertActive(this.lifetime.signal);
    const frame = this.frames.get(frameId);
    if (!frame) {
      throw new Error('Unknown fixture frame.');
    }
    frame.entries[representation]?.lifetime.abort();
    const entry: Entry = {
      representation,
      surface,
      document,
      representationHandle: crypto.randomUUID(),
      lifetime: new AbortController(),
      status: 'pending',
    };
    frame.entries[representation] = entry;
    return {
      ready: async () => {
        const signal = AbortSignal.any([this.lifetime.signal, entry.lifetime.signal]);
        const assertReady = () => {
          this.assertEntry(frame, entry, signal);
          if (entry.status === 'failed') {
            // A geometry read cannot recover a failed observer; replace its document.
            // Preserve the cause when the caller forwards this rejection to fail().
            throw new ReadError(
              entry.failure?.code ?? 'surface_failed',
              entry.failure?.message ?? 'The representation failed during readiness measurement.',
              structuredClone(entry.failure?.details),
            );
          }
        };
        assertReady();
        const layout = await surface.measureLayout(signal);
        assertReady();
        if (
          layout.viewport.width !== frame.descriptor.width ||
          (entry.representation === 'device' && layout.viewport.height !== frame.descriptor.height)
        ) {
          throw new ReadError(
            'stale_document',
            'The device viewport does not match its configured dimensions.',
          );
        }
        entry.documentId = layout.documentId;
        entry.documentInstanceId = layout.documentInstanceId;
        entry.status = 'current';
        delete entry.failure;
      },
      fail: (error?: unknown) => {
        if (frame.entries[entry.representation] === entry) {
          entry.status = 'failed';
          const failure = this.failure(
            error ?? new Error('The live representation failed to load.'),
          );
          entry.failure = {
            code: failure.code,
            message: failure.message,
            ...(failure.details === undefined ? {} : { details: structuredClone(failure.details) }),
          };
        }
      },
      dispose: () => {
        entry.lifetime.abort();
        if (frame.entries[entry.representation] === entry) {
          delete frame.entries[entry.representation];
        }
      },
    };
  }

  dispose() {
    this.lifetime.abort();
    this.editor?.dispose();
    for (const frame of this.frames.values()) {
      for (const entry of Object.values(frame.entries)) {
        entry.lifetime.abort();
      }
    }
  }

  /** Observed data refresh revokes reads before replacement starts. Known rejection
   * may restore the unchanged displayed render, under fresh inspection handles. */
  invalidateForRefresh() {
    this.refreshEpoch += 1;
    const epoch = this.refreshEpoch;
    const entries: Array<{ frame: Frame; entry: Entry; status: Entry['status'] }> = [];
    for (const frame of this.frames.values()) {
      for (const entry of Object.values(frame.entries)) {
        entries.push({ frame, entry, status: entry.status });
        entry.refreshEpoch = epoch;
        entry.status = 'stale';
        entry.lifetime.abort();
      }
    }
    return () => {
      this.assertActive(this.lifetime.signal);
      for (const { frame, entry, status } of entries) {
        if (
          frame.entries[entry.representation] === entry &&
          entry.refreshEpoch === epoch &&
          entry.status === 'stale'
        ) {
          entry.lifetime = new AbortController();
          entry.representationHandle = crypto.randomUUID();
          entry.status = status;
        }
      }
    };
  }

  tools(registrationSignal?: AbortSignal): ProbeTool[] {
    const definition = (
      name: string,
      description: string,
      properties: Record<string, unknown>,
      required: string[],
      read: (
        args: Record<string, unknown>,
        signal: AbortSignal,
      ) => Promise<Record<string, unknown>>,
    ): ProbeTool => ({
      name: `ghost_canvas_probe_${name}`,
      description,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      inputSchema: { type: 'object', properties, required, additionalProperties: false },
      execute: async (input, options) => {
        const signals = [
          this.lifetime.signal,
          ...(registrationSignal ? [registrationSignal] : []),
          ...(options?.signal ? [options.signal] : []),
        ];
        const signal = AbortSignal.any(signals);
        let abort!: () => void;
        let stop!: (result: ReadResult) => void;
        let target: Entry | undefined;
        let targetAbort: (() => void) | undefined;
        const stopped = new Promise<ReadResult>((resolve) => {
          stop = resolve;
          abort = () =>
            resolve(
              this.failure(
                new ReadError(
                  this.lifetime.signal.aborted || registrationSignal?.aborted
                    ? 'workspace_unavailable'
                    : 'cancelled',
                  'The fixture read is no longer active.',
                ),
              ),
            );
          signal.addEventListener('abort', abort, { once: true });
          if (signal.aborted) {
            abort();
          }
        });
        const work = async (): Promise<ReadResult> => {
          try {
            this.assertActive(signal);
            const args = argumentsObject(input, Object.keys(properties));
            if (name !== 'get_editor_state') {
              target = this.resolve(args).entry;
              targetAbort = () =>
                stop(
                  this.failure(
                    new ReadError(
                      'target_unavailable',
                      'The addressed live surface has been replaced.',
                    ),
                  ),
                );
              target.lifetime.signal.addEventListener('abort', targetAbort, { once: true });
              if (target.lifetime.signal.aborted) {
                targetAbort();
              }
            }
            const data = await read(args, signal);
            this.assertActive(signal);
            return { status: 'ok', data };
          } catch (error) {
            return this.failure(error);
          }
        };
        try {
          return await Promise.race([work(), stopped]);
        } finally {
          signal.removeEventListener('abort', abort);
          if (targetAbort) {
            target?.lifetime.signal.removeEventListener('abort', targetAbort);
          }
        }
      },
    });
    return [
      definition(
        'get_editor_state',
        'Read the theme canvas workspace, source revision, selected context with its originating representation target, board view and live targets. Device readiness describes the backing render; each inspection/capture checks local edits. Discover actual capabilities here before theme reads/writes. Does not move the canvas or change selection.',
        {},
        [],
        () => Promise.resolve(this.state()),
      ),
      definition(
        'inspect_frame',
        'Read the explicitly addressed current live page and source-aware outline. Requires discovered workspace/frame/representation handles, source revision and render key; never uses current focus or navigates. Data refresh invalidates old reads even at unchanged source revision. Refuses local drafts, modified DOM and inline notices rather than certifying them as the rendered revision.',
        targetProperties,
        targetKeys,
        (args, signal) => this.inspect(args, signal),
      ),
      definition(
        'inspect_element',
        'Inspect an explicitly addressed live occurrence in its originating representation/document. Copy the selected context target from state and its occurrence; never transfer occurrences between full-page/device documents or responsive counterparts. Does not change selection, focus, scroll or camera. Rejects stale document identities and local edits.',
        {
          ...targetProperties,
          documentId: { type: 'string', maxLength: 256 },
          documentInstanceId: { type: 'string', maxLength: 256 },
          occurrence: { type: 'string', maxLength: 256 },
        },
        [...targetKeys, 'documentId', 'documentInstanceId', 'occurrence'],
        (args, signal) => this.inspectElement(args, signal),
      ),
      definition(
        'capture_frame',
        'Capture the addressed fixed device viewport or one bounded document-coordinate region without changing the board, selection or scroll. Refuses local drafts, modified DOM and inline notices. Returns PNG data URL plus lineage/coverage/warnings. Native image consumption is experimental and unverified.',
        {
          ...targetProperties,
          kind: { type: 'string', enum: ['viewport', 'region'] },
          x: { type: 'integer', minimum: 0, maximum: 1_000_000 },
          y: { type: 'integer', minimum: 0, maximum: 1_000_000 },
          width: { type: 'integer', minimum: 1, maximum: SCREENSHOT_LIMITS.maxDimension },
          height: { type: 'integer', minimum: 1, maximum: SCREENSHOT_LIMITS.maxDimension },
        },
        [...targetKeys, 'kind'],
        (args, signal) => this.capture(args, signal),
      ),
      ...(this.editor?.tools(registrationSignal) ?? []),
    ];
  }

  private failure(error: unknown): ReadFailure {
    return {
      status: 'error',
      code:
        error instanceof ReadError || error instanceof CompositionGeometryChange
          ? error.code
          : 'read_failed',
      message: error instanceof Error ? error.message : 'The addressed fixture read failed.',
      ...(error instanceof ReadError || error instanceof CompositionGeometryChange
        ? { details: error.details }
        : {}),
    };
  }

  private assertActive(signal: AbortSignal) {
    if (this.lifetime.signal.aborted) {
      throw new ReadError(
        'workspace_unavailable',
        'This fixture workspace has closed. Rediscover the open editor.',
      );
    }
    if (signal.aborted) {
      throw new ReadError('cancelled', 'The fixture read was cancelled.');
    }
  }

  private assertEntry(frame: Frame, entry: Entry, signal: AbortSignal) {
    this.assertActive(this.lifetime.signal);
    if (frame.entries[entry.representation] !== entry || entry.lifetime.signal.aborted) {
      throw new ReadError('target_unavailable', 'The addressed live surface has been replaced.');
    }
    this.assertActive(signal);
  }

  private resolve(args: Record<string, unknown>) {
    const workspaceId = stringArgument(args, 'workspaceId');
    const frameHandle = stringArgument(args, 'frameHandle');
    const representationHandle = stringArgument(args, 'representationHandle');
    const revision = stringArgument(args, 'expectedRevision');
    const renderKey = stringArgument(args, 'expectedRenderKey');
    if (workspaceId !== this.workspaceId) {
      throw new ReadError('workspace_mismatch', 'Rediscover the current workspace before reading.');
    }
    const frame = [...this.frames.values()].find((item) => item.frameHandle === frameHandle);
    const entry =
      frame &&
      Object.values(frame.entries).find(
        (item) => item.representationHandle === representationHandle,
      );
    if (!frame || !entry || entry.representationHandle !== representationHandle) {
      throw new ReadError('target_unavailable', 'Rediscover the current live representation.');
    }
    if (entry.document.revision !== revision) {
      throw new ReadError(
        'revision_conflict',
        'The expected revision is not displayed by this representation.',
      );
    }
    if ((entry.document.renderKey ?? entry.document.revision) !== renderKey) {
      throw new ReadError(
        'render_conflict',
        'The renderer/data inputs changed. Rediscover the current render.',
      );
    }
    if (entry.status !== 'current') {
      throw new ReadError(
        entry.status === 'pending'
          ? 'pending'
          : entry.status === 'stale'
            ? 'stale_render'
            : 'surface_failed',
        'The addressed live representation is not ready.',
        entry.status === 'failed' && entry.failure
          ? { failure: structuredClone(entry.failure) }
          : undefined,
      );
    }
    return { frame, entry };
  }

  private async layout(frame: Frame, entry: Entry, signal: AbortSignal) {
    this.assertEntry(frame, entry, signal);
    const layout = await entry.surface.measureLayout(signal);
    this.assertEntry(frame, entry, signal);
    if (
      layout.documentId !== entry.documentId ||
      layout.documentInstanceId !== entry.documentInstanceId ||
      layout.viewport.width !== frame.descriptor.width ||
      (entry.representation === 'device' && layout.viewport.height !== frame.descriptor.height)
    ) {
      throw new ReadError('stale_document', 'The addressed live document or viewport changed.');
    }
    if (layout.localEdits.active || layout.localEdits.changed) {
      throw new ReadError(
        'local_edits_present',
        'This surface contains a local draft, modified DOM or an inline notice outside its rendered revision. Preserve the draft; explicitly address a discovered clean verification surface, wait for the notice to clear, or refresh after committing. No clean surface is substituted.',
      );
    }
    return layout;
  }

  private evidence(frame: Frame, entry: Entry, layout: PreviewLayout) {
    return {
      workspaceId: this.workspaceId,
      frameId: frame.descriptor.id,
      frameHandle: frame.frameHandle,
      representationHandle: entry.representationHandle,
      representation: entry.representation,
      revision: entry.document.revision,
      renderKey: entry.document.renderKey ?? entry.document.revision,
      dataGeneration: entry.document.dataGeneration ?? 0,
      documentId: layout.documentId,
      documentInstanceId: layout.documentInstanceId,
      provenance: { kind: 'rendered-document', localEditGeneration: layout.localEdits.generation },
      viewport: layout.viewport,
      document: layout.document,
    };
  }

  private async inspect(args: Record<string, unknown>, signal: AbortSignal) {
    const { frame, entry } = this.resolve(args);
    const currentSignal = AbortSignal.any([signal, entry.lifetime.signal]);
    const before = await this.layout(frame, entry, currentSignal);
    const page = await entry.surface.inspectPage(entry.document.url, currentSignal);
    const after = await this.layout(frame, entry, currentSignal);
    if (
      !sameLayout(before, after) ||
      page.viewport.width !== after.viewport.width ||
      page.viewport.height !== after.viewport.height ||
      page.viewport.scrollX !== after.viewport.scrollX ||
      page.viewport.scrollY !== after.viewport.scrollY
    ) {
      throw new ReadError('stale_document', 'The addressed layout changed during inspection.');
    }
    return { ...this.evidence(frame, entry, after), page };
  }

  private async inspectElement(args: Record<string, unknown>, signal: AbortSignal) {
    const { frame, entry } = this.resolve(args);
    const documentId = stringArgument(args, 'documentId');
    const documentInstanceId = stringArgument(args, 'documentInstanceId');
    const occurrence = stringArgument(args, 'occurrence');
    const currentSignal = AbortSignal.any([signal, entry.lifetime.signal]);
    const before = await this.layout(frame, entry, currentSignal);
    if (before.documentId !== documentId || before.documentInstanceId !== documentInstanceId) {
      throw new ReadError('stale_document', 'Use the occurrence in its originating live document.');
    }
    const element = await entry.surface.inspectElement({ occurrence }, currentSignal);
    const after = await this.layout(frame, entry, currentSignal);
    if (!sameLayout(before, after)) {
      throw new ReadError('stale_document', 'The addressed layout changed during inspection.');
    }
    return { ...this.evidence(frame, entry, after), element };
  }

  private async capture(args: Record<string, unknown>, signal: AbortSignal) {
    const { frame, entry } = this.resolve(args);
    if (entry.representation !== 'device') {
      throw new ReadError(
        'invalid_arguments',
        'Address a fixed-device representation for responsive captures.',
      );
    }
    let request: ScreenshotRequest;
    if (args.kind === 'viewport' && !['x', 'y', 'width', 'height'].some((key) => key in args)) {
      request = { kind: 'viewport' };
    } else if (
      args.kind === 'region' &&
      ['x', 'y', 'width', 'height'].every((key) => Number.isSafeInteger(args[key]))
    ) {
      const { x, y, width, height } = args as {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      if (
        x < 0 ||
        y < 0 ||
        x > 1_000_000 ||
        y > 1_000_000 ||
        width < 1 ||
        height < 1 ||
        width > SCREENSHOT_LIMITS.maxDimension ||
        height > SCREENSHOT_LIMITS.maxDimension ||
        width * height > SCREENSHOT_LIMITS.maxPixels
      ) {
        throw new ReadError('invalid_arguments', 'Capture bounds exceed the image budget.');
      }
      request = { kind: 'region', x, y, width, height };
    } else {
      throw new ReadError(
        'invalid_arguments',
        'Choose a viewport or a fully specified bounded region.',
      );
    }
    if (this.captureBusy) {
      throw new ReadError(
        'busy',
        'Another probe capture is still running. Retry after it settles.',
      );
    }
    this.captureBusy = true;
    try {
      const currentSignal = AbortSignal.any([signal, entry.lifetime.signal]);
      const before = await this.layout(frame, entry, currentSignal);
      const coverage =
        request.kind === 'region'
          ? { x: request.x, y: request.y, width: request.width, height: request.height }
          : {
              x: before.viewport.scrollX,
              y: before.viewport.scrollY,
              width: before.viewport.width,
              height: before.viewport.height,
            };
      if (
        request.kind === 'region' &&
        (coverage.x + coverage.width > before.document.width ||
          coverage.y + coverage.height > before.document.height)
      ) {
        throw new ReadError(
          'invalid_arguments',
          'The requested region is outside the current document.',
        );
      }
      const image = await entry.surface.screenshot(request, currentSignal);
      const after = await this.layout(frame, entry, currentSignal);
      if (
        !sameLayout(before, after) ||
        image.width !== coverage.width ||
        image.height !== coverage.height
      ) {
        throw new ReadError(
          'stale_document',
          'The device layout or capture dimensions changed during capture.',
        );
      }
      if (
        !image.dataUrl.startsWith('data:image/png;base64,') ||
        image.dataUrl.length > SCREENSHOT_LIMITS.maxDataUrlCharacters
      ) {
        throw new ReadError(
          'read_failed',
          'The captured image has an invalid format or exceeds the output budget.',
        );
      }
      return {
        ...this.evidence(frame, entry, after),
        coverage,
        image: {
          mimeType: 'image/png',
          dataUrl: image.dataUrl,
          width: image.width,
          height: image.height,
        },
        warnings: image.warnings,
        nativeImageConsumption: 'unverified',
      };
    } finally {
      this.captureBusy = false;
    }
  }
}

/** Feature-detected top-level registration using the current draft's abort cleanup. */
export function registerCanvasProbe(owner: Document, probe: CanvasProbe) {
  const lifetime = new AbortController();
  const ready = async (): Promise<ProbeRegistrationStatus> => {
    if (!owner.defaultView || owner.defaultView.parent !== owner.defaultView) {
      return 'unsupported';
    }
    try {
      const context =
        (owner as Document & { modelContext?: ModelContext }).modelContext ??
        (owner.defaultView.navigator as Navigator & { modelContext?: ModelContext }).modelContext;
      if (typeof context?.registerTool !== 'function') {
        return 'unsupported';
      }
      for (const tool of probe.tools(lifetime.signal)) {
        if (lifetime.signal.aborted) {
          return 'failed';
        }
        await context.registerTool(tool, { signal: lifetime.signal });
      }
      return lifetime.signal.aborted ? 'failed' : 'registered';
    } catch {
      lifetime.abort();
      return 'failed';
    }
  };
  return {
    ready: ready(),
    dispose: () => {
      lifetime.abort();
      probe.dispose();
    },
  };
}
