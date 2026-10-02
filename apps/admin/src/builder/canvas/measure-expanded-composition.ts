import type {
  IframePreviewDocumentSurface,
  PreviewLayout,
} from '@/builder/workspaces/theme/preview/preview-document';

// Provisional feasibility limits, independent of the fixed device and capture budgets.
export const EXPANDED_COMPOSITION_LIMITS = {
  maxRounds: 8,
  maxDuration: 1_500,
  maxHeight: 16_000,
  observationInterval: 70,
} as const;

export type ExpandedComposition = {
  frameId: string;
  revision: string;
  documentId: string;
  configuredViewport: { width: number; height: number };
  viewport: PreviewLayout['viewport'];
  document: PreviewLayout['document'];
  measurements: PreviewLayout[];
  duration: number;
  status: 'settled' | 'height-limit' | 'round-limit';
  warnings: string[];
};

/** Only resize a dedicated composition surface. The caller retains its fixed device. */
export async function measureExpandedComposition(
  surface: Pick<IframePreviewDocumentSurface, 'measureLayout'>,
  resize: (height: number, signal: AbortSignal) => Promise<void>,
  frameId: string,
  revision: string,
  signal: AbortSignal,
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
    const initial = await surface.measureLayout(controller.signal);
    assertActive();
    if (initial.viewport.height > EXPANDED_COMPOSITION_LIMITS.maxHeight) {
      throw new Error('The starting composition viewport exceeds its height limit.');
    }
    const measurements = [initial];
    let current = initial;
    let status: ExpandedComposition['status'] = 'round-limit';
    while (measurements.length < EXPANDED_COMPOSITION_LIMITS.maxRounds) {
      if (
        current.viewport.height === EXPANDED_COMPOSITION_LIMITS.maxHeight &&
        current.document.height > current.viewport.height
      ) {
        status = 'height-limit';
        break;
      }
      const height = Math.min(current.document.height, EXPANDED_COMPOSITION_LIMITS.maxHeight);
      assertActive();
      // Even an unchanged height waits for a second observation of the same geometry.
      await resize(height, controller.signal);
      assertActive();
      const next = await surface.measureLayout(controller.signal);
      assertActive();
      if (
        next.documentId !== initial.documentId ||
        next.viewport.width !== initial.viewport.width ||
        next.viewport.height !== height
      ) {
        throw new Error(
          'The composition document or configured viewport changed during measurement.',
        );
      }
      measurements.push(next);
      if (
        next.viewport.height === current.viewport.height &&
        next.document.height === current.document.height &&
        next.document.width === current.document.width &&
        next.document.height === next.viewport.height
      ) {
        status = 'settled';
        current = next;
        break;
      }
      current = next;
    }
    if (
      current.viewport.height === EXPANDED_COMPOSITION_LIMITS.maxHeight &&
      current.document.height > current.viewport.height
    ) {
      status = 'height-limit';
    }
    const warnings = [
      'Expanded height changes viewport-dependent layout; fixed device previews remain authoritative.',
    ];
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
      configuredViewport: { width: initial.viewport.width, height: initial.viewport.height },
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
