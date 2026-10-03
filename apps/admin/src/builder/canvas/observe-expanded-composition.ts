import {
  measureExpandedComposition,
  EXPANDED_COMPOSITION_LIMITS,
} from './measure-expanded-composition';
import type { ExpandedComposition } from './measure-expanded-composition';
import type {
  IframePreviewDocumentSurface,
  PreviewLayoutChange,
} from '@/builder/workspaces/theme/preview/preview-document';

/** Serial, bounded settling on one retained document; hints never authorize geometry. */
export function observeExpandedComposition({
  surface,
  resize,
  frameId,
  revision,
  viewport,
  signal,
  isPaused,
  onResult,
  onError,
  onStart,
}: {
  surface: Pick<IframePreviewDocumentSurface, 'measureLayout' | 'onLayoutChange'>;
  resize: (height: number, signal: AbortSignal) => Promise<void>;
  frameId: string;
  revision: string;
  viewport: { width: number; height: number };
  signal: AbortSignal;
  isPaused: () => boolean;
  onResult: (result: ExpandedComposition) => void;
  onError: (error: unknown) => void;
  onStart?: () => void;
}) {
  let stopped = false;
  let limited = false;
  let measuring = false;
  let dirty = true;
  let latest: PreviewLayoutChange | null = null;
  let current: ExpandedComposition | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const controller = new AbortController();
  let resolveReady!: () => void;
  let rejectReady!: (error: unknown) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const matches = (hint: PreviewLayoutChange | null, result: ExpandedComposition | null) =>
    !!hint &&
    !!result &&
    hint.documentId === result.documentId &&
    hint.documentInstanceId === result.documentInstanceId &&
    (hint.layoutSample <= (result.measurements.at(-1)?.layoutSample ?? -1) ||
      (hint.layoutGeneration === result.measurements.at(-1)?.layoutGeneration &&
        hint.viewport.width === result.viewport.width &&
        hint.viewport.height === result.viewport.height &&
        hint.document.width === result.document.width &&
        hint.document.height === result.document.height));
  const schedule = () => {
    if (!stopped && !limited && !measuring && dirty && !isPaused() && timer === null) {
      timer = setTimeout(() => {
        timer = null;
        void run();
      }, EXPANDED_COMPOSITION_LIMITS.observationInterval);
    }
  };
  const run = async () => {
    if (stopped || limited || isPaused()) {
      return;
    }
    measuring = true;
    onStart?.();
    dirty = false;
    latest = null;
    try {
      const result = await measureExpandedComposition(
        surface,
        async (height, active) => {
          if (isPaused()) {
            throw new Error('Composition measurement is paused for a retained text draft.');
          }
          await resize(height, active);
        },
        frameId,
        revision,
        controller.signal,
        viewport,
      );
      if (stopped) {
        return;
      }
      current = result;
      limited = result.status !== 'settled';
      onResult(result);
      resolveReady();
    } catch (error) {
      if (stopped) {
        return;
      }
      if (isPaused()) {
        dirty = true;
      } else {
        limited = true;
        onError(error);
        rejectReady(error);
      }
    } finally {
      measuring = false;
      // Our own resize notifications end at the measured geometry. An external
      // change after the final read schedules one follow-up, not a feedback loop.
      if (!isPaused() && !limited) {
        dirty = latest !== null && !matches(latest, current);
      }
      schedule();
    }
  };
  const remove = surface.onLayoutChange((change) => {
    latest = change;
    if (!matches(change, current)) {
      dirty = true;
      schedule();
    }
  });
  const dispose = () => {
    if (stopped) {
      return;
    }
    stopped = true;
    if (timer !== null) {
      clearTimeout(timer);
    }
    remove();
    signal.removeEventListener('abort', dispose);
    const error = new DOMException('Composition observation stopped.', 'AbortError');
    controller.abort(error);
    rejectReady(error);
  };
  signal.addEventListener('abort', dispose, { once: true });
  if (signal.aborted) {
    dispose();
  } else {
    void run();
  }
  return { ready, resume: schedule, dispose };
}
