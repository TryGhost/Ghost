import type {
  IframePreviewDocumentSurface,
  PreviewLayout,
} from '@/builder/workspaces/theme/preview/preview-document';

// Safety bounds allow ordinary theme startup to settle; these are not speed targets.
export const EXPANDED_COMPOSITION_LIMITS = {
  maxRounds: 16,
  maxDuration: 5_000,
  maxHeight: 16_000,
  observationInterval: 70,
} as const;

export type ExpandedComposition = {
  frameId: string;
  revision: string;
  documentId: string;
  documentInstanceId: string;
  configuredViewport: { width: number; height: number };
  /** Applied outer iframe height; browser innerHeight can differ after scaling. */
  frameHeight: number;
  viewportAdjustments: CompositionGeometryChange['details'][];
  viewport: PreviewLayout['viewport'];
  document: PreviewLayout['document'];
  measurements: PreviewLayout[];
  duration: number;
  status: 'settled' | 'best-effort' | 'height-limit' | 'round-limit';
  warnings: string[];
};

/** Text admission can precede the parent's draft reservation; retry after release. */
export class CompositionEditInterruption extends Error {
  constructor() {
    super('Composition measurement is interrupted by a local text edit.');
    this.name = 'CompositionEditInterruption';
  }
}

type CompositionGeometry = {
  documentId: string;
  documentInstanceId: string;
  viewport: { width: number; height: number };
};

/** Preserve the mismatch for native diagnostics without putting geometry in UI copy. */
export class CompositionGeometryChange extends Error {
  readonly code: 'composition_document_changed' | 'composition_viewport_changed';
  readonly details: {
    phase: 'viewport-reset' | 'expansion';
    expected: CompositionGeometry;
    actual: CompositionGeometry;
  };

  constructor(
    expected: CompositionGeometry,
    actual: CompositionGeometry,
    phase: 'viewport-reset' | 'expansion',
  ) {
    const changedDocument =
      expected.documentId !== actual.documentId ||
      expected.documentInstanceId !== actual.documentInstanceId;
    super(
      changedDocument
        ? 'The composition document changed during measurement.'
        : 'The composition viewport changed during measurement.',
    );
    this.name = 'CompositionGeometryChange';
    this.code = changedDocument ? 'composition_document_changed' : 'composition_viewport_changed';
    const geometry = (value: CompositionGeometry): CompositionGeometry => ({
      documentId: value.documentId,
      documentInstanceId: value.documentInstanceId,
      viewport: { width: value.viewport.width, height: value.viewport.height },
    });
    this.details = { phase, expected: geometry(expected), actual: geometry(actual) };
  }
}

/** Only resize a dedicated composition surface. The caller retains its fixed device. */
export async function measureExpandedComposition(
  surface: Pick<IframePreviewDocumentSurface, 'measureLayout'>,
  resize: (height: number, signal: AbortSignal) => Promise<void>,
  frameId: string,
  revision: string,
  signal: AbortSignal,
  configuredViewport?: { width: number; height: number },
): Promise<ExpandedComposition> {
  const started = performance.now();
  const controller = new AbortController();
  let rejectStopped!: (error: unknown) => void;
  const stopped = new Promise<never>((_, reject) => {
    rejectStopped = reject;
  });
  const stop = (error: DOMException) => {
    controller.abort(error);
    rejectStopped(error);
  };
  const cancel = () => stop(new DOMException('Aborted', 'AbortError'));
  const timeout = () =>
    stop(
      new DOMException(
        'Expanded composition measurement exceeded its settling time.',
        'TimeoutError',
      ),
    );
  const assertActive = () => {
    if (
      !controller.signal.aborted &&
      performance.now() - started >= EXPANDED_COMPOSITION_LIMITS.maxDuration
    ) {
      timeout();
    }
    if (controller.signal.aborted) {
      throw controller.signal.reason;
    }
  };
  const deadline = setTimeout(timeout, EXPANDED_COMPOSITION_LIMITS.maxDuration);
  signal.addEventListener('abort', cancel, { once: true });
  if (signal.aborted) {
    cancel();
  }

  const work = async (): Promise<ExpandedComposition> => {
    assertActive();
    const preflight = await surface.measureLayout(controller.signal);
    assertActive();
    if (preflight.localEdits.active || preflight.localEdits.changed) {
      throw new CompositionEditInterruption();
    }
    const measurements = [preflight];
    let initial = preflight;
    let frameHeight = Math.min(
      configuredViewport?.height ?? preflight.viewport.height,
      EXPANDED_COMPOSITION_LIMITS.maxHeight,
    );
    const viewportAdjustments: CompositionGeometryChange['details'][] = [];
    const recordViewport = (
      expected: CompositionGeometry,
      actual: CompositionGeometry,
      phase: CompositionGeometryChange['details']['phase'],
    ) => {
      if (
        expected.viewport.width !== actual.viewport.width ||
        expected.viewport.height !== actual.viewport.height
      ) {
        viewportAdjustments.push(new CompositionGeometryChange(expected, actual, phase).details);
      }
    };
    if (configuredViewport) {
      if (
        !Number.isSafeInteger(configuredViewport.height) ||
        configuredViewport.height < 1 ||
        configuredViewport.height > EXPANDED_COMPOSITION_LIMITS.maxHeight
      ) {
        throw new Error('The configured composition viewport exceeds its height limit.');
      }
      // scrollHeight includes the current viewport floor. Resetting within the
      // same bounded pass lets later measurements detect content shrinkage too.
      await resize(configuredViewport.height, controller.signal);
      assertActive();
      initial = await surface.measureLayout(controller.signal);
      assertActive();
      measurements.push(initial);
      if (
        initial.documentId !== preflight.documentId ||
        initial.documentInstanceId !== preflight.documentInstanceId
      ) {
        throw new CompositionGeometryChange(
          { ...preflight, viewport: configuredViewport },
          initial,
          'viewport-reset',
        );
      }
    }
    recordViewport(
      { ...initial, viewport: configuredViewport ?? preflight.viewport },
      initial,
      'viewport-reset',
    );
    if (
      initial.localEdits.generation !== preflight.localEdits.generation ||
      initial.localEdits.active ||
      initial.localEdits.changed
    ) {
      throw new CompositionEditInterruption();
    }
    let current = initial;
    let resetForContent = false;
    let status: ExpandedComposition['status'] = 'round-limit';
    while (measurements.length < EXPANDED_COMPOSITION_LIMITS.maxRounds) {
      if (
        frameHeight === EXPANDED_COMPOSITION_LIMITS.maxHeight &&
        current.document.height > Math.max(frameHeight, current.viewport.height)
      ) {
        status = 'height-limit';
        break;
      }
      const height: number =
        resetForContent && configuredViewport
          ? configuredViewport.height
          : Math.min(
              Math.max(
                configuredViewport?.height ?? initial.viewport.height,
                // Avoid accumulating rounding when content already fits the observed viewport.
                current.document.height <= current.viewport.height
                  ? frameHeight
                  : current.document.height,
              ),
              EXPANDED_COMPOSITION_LIMITS.maxHeight,
            );
      resetForContent = false;
      assertActive();
      // Even an unchanged height waits for a second observation of the same geometry.
      await resize(height, controller.signal);
      frameHeight = height;
      assertActive();
      const next = await surface.measureLayout(controller.signal);
      assertActive();
      if (
        next.localEdits.generation !== initial.localEdits.generation ||
        next.localEdits.active ||
        next.localEdits.changed
      ) {
        throw new CompositionEditInterruption();
      }
      if (
        next.documentId !== initial.documentId ||
        next.documentInstanceId !== initial.documentInstanceId
      ) {
        throw new CompositionGeometryChange(
          { ...initial, viewport: { width: initial.viewport.width, height } },
          next,
          'expansion',
        );
      }
      recordViewport(
        {
          ...initial,
          viewport: { width: configuredViewport?.width ?? initial.viewport.width, height },
        },
        next,
        'expansion',
      );
      measurements.push(next);
      // A mutation while expanding can shrink content behind scrollHeight's
      // viewport floor. Re-read at the configured height within the same budget.
      resetForContent =
        !!configuredViewport &&
        next.viewport.height > configuredViewport.height &&
        next.layoutGeneration !== current.layoutGeneration;
      if (
        !resetForContent &&
        next.viewport.height === current.viewport.height &&
        next.viewport.width === current.viewport.width &&
        next.document.height === current.document.height &&
        next.document.width === current.document.width &&
        next.layoutGeneration === current.layoutGeneration &&
        next.document.height <= Math.max(frameHeight, next.viewport.height)
      ) {
        status =
          next.viewport.height === frameHeight &&
          next.viewport.width === (configuredViewport?.width ?? initial.viewport.width)
            ? 'settled'
            : 'best-effort';
        current = next;
        break;
      }
      current = next;
    }
    if (
      frameHeight === EXPANDED_COMPOSITION_LIMITS.maxHeight &&
      current.document.height > Math.max(frameHeight, current.viewport.height)
    ) {
      status = 'height-limit';
    }
    const warnings = [
      'Expanded height changes viewport-dependent layout; fixed device previews remain authoritative.',
    ];
    if (viewportAdjustments.length > 0) {
      warnings.push(
        'The browser reported different viewport dimensions; the composition uses best-effort frame sizing.',
      );
    }
    if (status === 'height-limit') {
      warnings.push(
        'The composition is truncated at its height limit; open the fixed device to inspect the remaining content.',
      );
    } else if (status === 'round-limit') {
      warnings.push('The composition height has not settled within its measurement-round limit.');
    }
    if (current.document.width > current.viewport.width) {
      warnings.push('Horizontal overflow outside the configured width is not shown.');
    }
    return {
      frameId,
      revision,
      documentId: current.documentId,
      documentInstanceId: current.documentInstanceId,
      configuredViewport: configuredViewport ?? {
        width: initial.viewport.width,
        height: initial.viewport.height,
      },
      frameHeight,
      viewportAdjustments,
      viewport: current.viewport,
      document: current.document,
      measurements,
      duration: performance.now() - started,
      status,
      warnings,
    };
  };
  try {
    return await Promise.race([work(), stopped]);
  } finally {
    clearTimeout(deadline);
    signal.removeEventListener('abort', cancel);
  }
}

/** Abortable quiet interval; does not depend on animation frames in hidden views. */
export function waitForCompositionLayout(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      reject(
        signal.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError'),
      );
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, EXPANDED_COMPOSITION_LIMITS.observationInterval);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) {
      abort();
    }
  });
}
