import { afterEach, describe, expect, it, vi } from 'vitest';
import { observeExpandedComposition } from './observe-expanded-composition';
import type { ExpandedComposition } from './measure-expanded-composition';
import type {
  PreviewLayout,
  PreviewLayoutChange,
} from '@/builder/workspaces/theme/preview/preview-document';

function fixture(extent?: (height: number) => number) {
  let height = 844;
  let naturalHeight = 1200;
  let generation = 0;
  let sample = 0;
  let paused = false;
  let listener: ((change: PreviewLayoutChange) => void) | null = null;
  const geometry = () => {
    sample += 1;
    return {
      documentId: 'document-1',
      documentInstanceId: 'instance-1',
      layoutGeneration: generation,
      layoutSample: sample,
      viewport: { width: 390, height },
      document: { width: 390, height: Math.max(height, extent?.(height) ?? naturalHeight) },
    };
  };
  const surface = {
    measureLayout: vi.fn((): Promise<PreviewLayout> =>
      Promise.resolve({
        ...geometry(),
        localEdits: { generation: 0, active: false, changed: false },
        viewport: { width: 390, height, scrollX: 0, scrollY: 0 },
      }),
    ),
    onLayoutChange: vi.fn((handler: (change: PreviewLayoutChange) => void) => {
      listener = handler;
      return () => (listener = null);
    }),
  };
  const resize = vi.fn((next: number) => {
    height = next;
    listener?.(geometry());
    return Promise.resolve();
  });
  const controller = new AbortController();
  const onResult = vi.fn<(result: ExpandedComposition) => void>();
  const onError = vi.fn();
  const observation = observeExpandedComposition({
    surface,
    resize,
    frameId: 'home-mobile',
    revision: 'revision-1',
    viewport: { width: 390, height: 844 },
    signal: controller.signal,
    isPaused: () => paused,
    onResult,
    onError,
  });
  return {
    surface,
    resize,
    onResult,
    onError,
    observation,
    controller,
    pause: (next: boolean) => (paused = next),
    change: (next: number) => {
      naturalHeight = next;
      generation += 1;
      listener?.(geometry());
    },
  };
}

afterEach(() => vi.useRealTimers());

describe('ongoing composition observation', () => {
  it('grows and shrinks the retained surface without looping on its own resize notices', async () => {
    vi.useFakeTimers();
    const value = fixture();
    try {
      await value.observation.ready;
      await vi.advanceTimersByTimeAsync(500);
      expect(value.onResult).toHaveBeenCalledOnce();
      value.change(2400);
      await vi.advanceTimersByTimeAsync(500);
      expect(value.onResult).toHaveBeenCalledTimes(2);
      expect(value.onResult.mock.lastCall![0].viewport.height).toBe(2400);
      value.change(1000);
      await vi.advanceTimersByTimeAsync(500);
      expect(value.onResult).toHaveBeenCalledTimes(3);
      expect(value.onResult.mock.lastCall![0].viewport.height).toBe(1000);
      expect(value.onResult.mock.lastCall![0].documentInstanceId).toBe('instance-1');
      expect(value.onError).not.toHaveBeenCalled();
    } finally {
      value.observation.dispose();
    }
  });

  it('coalesces changes while paused and resumes once the retained draft is released', async () => {
    vi.useFakeTimers();
    const value = fixture();
    try {
      await value.observation.ready;
      const count = value.resize.mock.calls.length;
      value.pause(true);
      value.change(1800);
      value.change(2400);
      await vi.advanceTimersByTimeAsync(1000);
      expect(value.resize).toHaveBeenCalledTimes(count);
      value.pause(false);
      value.observation.resume();
      await vi.advanceTimersByTimeAsync(500);
      expect(value.onResult).toHaveBeenCalledTimes(2);
      expect(value.onResult.mock.lastCall![0].viewport.height).toBe(2400);
    } finally {
      value.observation.dispose();
    }
  });

  it('stops automatic settling at a layout limit and releases queued work on abort', async () => {
    vi.useFakeTimers();
    const limited = fixture((height) => height + 100);
    try {
      await limited.observation.ready;
      expect(limited.onResult.mock.lastCall![0].status).toBe('round-limit');
      limited.change(5000);
      await vi.advanceTimersByTimeAsync(1000);
      expect(limited.onResult).toHaveBeenCalledOnce();
    } finally {
      limited.observation.dispose();
    }
    const value = fixture();
    await value.observation.ready;
    const count = value.resize.mock.calls.length;
    value.change(2400);
    value.controller.abort();
    await vi.advanceTimersByTimeAsync(1000);
    expect(value.resize).toHaveBeenCalledTimes(count);
    expect(value.onError).not.toHaveBeenCalled();
  });
});
