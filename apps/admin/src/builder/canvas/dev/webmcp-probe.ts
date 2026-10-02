import { SCREENSHOT_LIMITS } from '@/builder/workspaces/theme/preview/screenshot';

import type { CanvasView } from '@/builder/canvas/canvas-board';
import type {
  IframePreviewDocumentSurface,
  PreviewDocument,
  PreviewLayout,
} from '@/builder/workspaces/theme/preview/preview-document';
import type { ScreenshotRequest } from '@/builder/workspaces/theme/preview/screenshot';

export type CanvasProbeSurface = Pick<
  IframePreviewDocumentSurface,
  'measureLayout' | 'inspectPage' | 'screenshot'
>;
type FrameDescriptor = { id: string; label: string; group: string; width: number; height: number };
type ReadResult =
  | { status: 'ok'; data: Record<string, unknown> }
  | { status: 'error'; code: string; message: string };
export type ProbeTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: true; untrustedContentHint: true };
  execute: (input: unknown, options?: { signal?: AbortSignal }) => Promise<ReadResult>;
};
type ModelContext = {
  registerTool: (tool: ProbeTool, options: { signal: AbortSignal }) => void | Promise<void>;
};
export type ProbeRegistrationStatus = 'unsupported' | 'registered' | 'failed';

class ReadError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
type Entry = {
  surface: CanvasProbeSurface;
  document: PreviewDocument;
  representationHandle: string;
  lifetime: AbortController;
  status: 'pending' | 'current' | 'failed';
  documentId?: string;
};
type Frame = { descriptor: FrameDescriptor; frameHandle: string; entry?: Entry };
const targetProperties = {
  workspaceId: { type: 'string', maxLength: 256 },
  frameHandle: { type: 'string', maxLength: 256 },
  representationHandle: { type: 'string', maxLength: 256 },
  expectedRevision: { type: 'string', maxLength: 256 },
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
    first.viewport.width === next.viewport.width &&
    first.viewport.height === next.viewport.height &&
    first.viewport.scrollX === next.viewport.scrollX &&
    first.viewport.scrollY === next.viewport.scrollY &&
    first.document.width === next.document.width &&
    first.document.height === next.document.height
  );
}

/** Read-only Stage A fixture registry. It is not the shared mutation controller. */
export class CanvasProbe {
  readonly workspaceId = crypto.randomUUID();
  private readonly lifetime = new AbortController();
  private readonly frames = new Map<string, Frame>();
  private captureBusy = false;
  private view: CanvasView = {
    camera: { x: 0, y: 0, scale: 1 },
    selectedFrameId: null,
    openedFrameId: null,
  };
  private mode = 'captured';
  private readonly siteUrl: string;

  constructor(descriptors: readonly FrameDescriptor[], siteUrl: string) {
    this.siteUrl = siteUrl;
    if (
      descriptors.length > 10 ||
      new Set(descriptors.map((frame) => frame.id)).size !== descriptors.length
    ) {
      throw new Error('The fixture probe requires at most ten uniquely identified frames.');
    }
    for (const descriptor of descriptors) {
      this.frames.set(descriptor.id, {
        descriptor: { ...descriptor },
        frameHandle: crypto.randomUUID(),
      });
    }
  }

  setView(view: CanvasView, mode: string) {
    this.view = { ...view, camera: { ...view.camera } };
    this.mode = mode;
  }

  state() {
    return {
      protocolVersion: 'canvas-fixture-probe-1',
      workspaceId: this.workspaceId,
      siteUrl: this.siteUrl,
      fixture: true,
      capabilities: {
        readOnly: true,
        mutations: false,
        publication: false,
        representations: ['device'],
        captureFormat: 'png-data-url-experiment',
        nativeImageConsumption: 'unverified',
      },
      view: { ...this.view, camera: { ...this.view.camera }, mode: this.mode },
      frames: [...this.frames.values()].map((frame) => ({
        ...frame.descriptor,
        frameHandle: frame.frameHandle,
        device: frame.entry
          ? {
              representationHandle: frame.entry.representationHandle,
              status: frame.entry.status,
              revision: frame.entry.document.revision,
              documentId: frame.entry.documentId ?? null,
              viewport: { width: frame.descriptor.width, height: frame.descriptor.height },
            }
          : null,
      })),
    };
  }

  attach(frameId: string, surface: CanvasProbeSurface, document: PreviewDocument) {
    this.assertActive(this.lifetime.signal);
    const frame = this.frames.get(frameId);
    if (!frame) {
      throw new Error('Unknown fixture frame.');
    }
    frame.entry?.lifetime.abort();
    const entry: Entry = {
      surface,
      document,
      representationHandle: crypto.randomUUID(),
      lifetime: new AbortController(),
      status: 'pending',
    };
    frame.entry = entry;
    return {
      ready: async () => {
        const signal = AbortSignal.any([this.lifetime.signal, entry.lifetime.signal]);
        const layout = await surface.measureLayout(signal);
        this.assertEntry(frame, entry, signal);
        if (
          layout.viewport.width !== frame.descriptor.width ||
          layout.viewport.height !== frame.descriptor.height
        ) {
          throw new ReadError(
            'stale_document',
            'The device viewport does not match its configured dimensions.',
          );
        }
        entry.documentId = layout.documentId;
        entry.status = 'current';
      },
      fail: () => {
        if (frame.entry === entry) {
          entry.status = 'failed';
        }
      },
      dispose: () => {
        entry.lifetime.abort();
        if (frame.entry === entry) {
          frame.entry = undefined;
        }
      },
    };
  }

  dispose() {
    this.lifetime.abort();
    for (const frame of this.frames.values()) {
      frame.entry?.lifetime.abort();
    }
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
                      'The addressed device surface has been replaced.',
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
        'Read this experimental canvas fixture workspace, current board view and immutable fixed-device targets. Does not move the canvas or change selection. No mutation or publishing tools are available.',
        {},
        [],
        () => Promise.resolve(this.state()),
      ),
      definition(
        'inspect_frame',
        'Read the explicitly addressed current fixed-device page and source-aware outline. Requires discovered workspace/frame/representation handles and revision; never uses current focus or navigates.',
        targetProperties,
        targetKeys,
        (args, signal) => this.inspect(args, signal),
      ),
      definition(
        'capture_frame',
        'Capture the addressed fixed device viewport or one bounded document-coordinate region without changing the board, selection or scroll. Returns PNG data URL plus lineage/coverage/warnings. Native image consumption is experimental and unverified.',
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
    ];
  }

  private failure(error: unknown): ReadResult {
    return {
      status: 'error',
      code: error instanceof ReadError ? error.code : 'read_failed',
      message: error instanceof Error ? error.message : 'The addressed fixture read failed.',
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
    if (frame.entry !== entry || entry.lifetime.signal.aborted) {
      throw new ReadError('target_unavailable', 'The addressed device surface has been replaced.');
    }
    this.assertActive(signal);
  }

  private resolve(args: Record<string, unknown>) {
    const workspaceId = stringArgument(args, 'workspaceId');
    const frameHandle = stringArgument(args, 'frameHandle');
    const representationHandle = stringArgument(args, 'representationHandle');
    const revision = stringArgument(args, 'expectedRevision');
    if (workspaceId !== this.workspaceId) {
      throw new ReadError('workspace_mismatch', 'Rediscover the current workspace before reading.');
    }
    const frame = [...this.frames.values()].find((item) => item.frameHandle === frameHandle);
    const entry = frame?.entry;
    if (!frame || !entry || entry.representationHandle !== representationHandle) {
      throw new ReadError('target_unavailable', 'Rediscover the current device representation.');
    }
    if (entry.document.revision !== revision) {
      throw new ReadError(
        'revision_conflict',
        'The expected revision is not displayed by this device.',
      );
    }
    if (entry.status !== 'current') {
      throw new ReadError(
        entry.status === 'pending' ? 'pending' : 'surface_failed',
        'The addressed device is not ready.',
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
      layout.viewport.width !== frame.descriptor.width ||
      layout.viewport.height !== frame.descriptor.height
    ) {
      throw new ReadError('stale_document', 'The addressed device document or viewport changed.');
    }
    return layout;
  }

  private evidence(frame: Frame, entry: Entry, layout: PreviewLayout) {
    return {
      workspaceId: this.workspaceId,
      frameId: frame.descriptor.id,
      frameHandle: frame.frameHandle,
      representationHandle: entry.representationHandle,
      representation: 'device',
      revision: entry.document.revision,
      documentId: layout.documentId,
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

  private async capture(args: Record<string, unknown>, signal: AbortSignal) {
    const { frame, entry } = this.resolve(args);
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
      const context = (owner as Document & { modelContext?: ModelContext }).modelContext;
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
