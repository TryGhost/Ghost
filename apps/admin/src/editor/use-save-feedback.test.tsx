import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useLayoutEffect } from 'react';
import type { SaveCompletion } from './engine/save-engine';
import { useSaveButtonPhase } from './use-save-feedback';
import { deferred } from '@/utils/deferred';

const failed: SaveCompletion = {
  kind: 'failed',
  error: { kind: 'conflict', message: 'Reload this post.' },
  executedAs: 'explicit',
};
const saved: SaveCompletion = {
  kind: 'saved',
  result: { id: 'post-id', status: 'published', updatedAt: '2026-01-01T09:00:00.000Z' },
  executedAs: 'explicit',
};

describe('useSaveButtonPhase', () => {
  it('keeps a failed save available to retry until the document is replaced', async () => {
    const save = vi.fn().mockResolvedValue(failed);
    const { result, rerender } = renderHook(
      ({ contentKey }) => useSaveButtonPhase(save, contentKey),
      {
        initialProps: { contentKey: 0 },
      },
    );

    await act(() => result.current.run());
    expect(result.current.phase).toBe('failure');
    rerender({ contentKey: 0 });
    expect(result.current.phase).toBe('failure');

    rerender({ contentKey: 1 });
    expect(result.current.phase).toBe('idle');
  });

  it('tracks a save started as the replacement document commits', async () => {
    const pending = deferred<SaveCompletion>();
    const save = vi.fn().mockReturnValue(pending.promise);
    let running!: Promise<void>;
    const { result, rerender } = renderHook(
      ({ contentKey }) => {
        const feedback = useSaveButtonPhase(save, contentKey);
        const { run } = feedback;
        useLayoutEffect(() => {
          if (contentKey === 1) {
            running = run();
          }
        }, [contentKey, run]);
        return feedback;
      },
      { initialProps: { contentKey: 0 } },
    );

    rerender({ contentKey: 1 });
    expect(result.current.phase).toBe('running');
    await act(async () => {
      pending.resolve(failed);
      await running;
    });
    expect(result.current.phase).toBe('failure');
  });

  it.each([failed, saved])(
    'ignores a previous document’s late $kind completion',
    async (completion) => {
      const previous = deferred<SaveCompletion>();
      const current = deferred<SaveCompletion>();
      const save = vi
        .fn()
        .mockReturnValueOnce(previous.promise)
        .mockReturnValueOnce(current.promise);
      const { result, rerender } = renderHook(
        ({ contentKey }) => useSaveButtonPhase(save, contentKey),
        {
          initialProps: { contentKey: 0 },
        },
      );

      let previousRun!: Promise<void>;
      act(() => {
        previousRun = result.current.run();
      });
      expect(result.current.phase).toBe('running');
      rerender({ contentKey: 1 });
      expect(result.current.phase).toBe('idle');

      let currentRun!: Promise<void>;
      act(() => {
        currentRun = result.current.run();
      });
      await act(async () => {
        previous.resolve(completion);
        await previousRun;
      });
      expect(result.current.phase).toBe('running');

      await act(async () => {
        current.resolve(failed);
        await currentRun;
      });
      expect(result.current.phase).toBe('failure');
    },
  );
});
