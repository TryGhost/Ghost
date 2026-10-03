import { describe, expect, it, vi } from 'vitest';

import {
  EXPANDED_COMPOSITION_LIMITS,
  measureExpandedComposition,
} from './measure-expanded-composition';
import type { PreviewLayout } from '@/builder/workspaces/theme/preview/preview-document';

function preview(extent: (height: number) => number) {
  let height = 844;
  const surface = {
    measureLayout: vi.fn(() =>
      Promise.resolve<PreviewLayout>({
        documentId: 'composition-document',
        documentInstanceId: 'composition-instance',
        localEdits: { generation: 0, active: false, changed: false },
        viewport: { width: 390, height, scrollX: 0, scrollY: 0 },
        document: { width: 390, height: Math.max(height, extent(height)) },
      }),
    ),
  };
  const resize = vi.fn((next: number) => {
    height = next;
    return Promise.resolve();
  });
  return { surface, resize };
}

function measure(value: ReturnType<typeof preview>, signal = new AbortController().signal) {
  return measureExpandedComposition(
    value.surface,
    value.resize,
    'home-mobile',
    'revision-1',
    signal,
  );
}

describe('bounded expanded composition measurements', () => {
  it('remeasures the viewport floor when content shrinks during an expanding pass', async () => {
    let extent = 4000;
    let generation = 0;
    const value = preview(() => extent);
    const read = value.surface.measureLayout.getMockImplementation()!;
    const resize = value.resize.getMockImplementation()!;
    value.surface.measureLayout.mockImplementation(async () => ({
      ...(await read()),
      layoutGeneration: generation,
    }));
    value.resize.mockImplementation((height) => {
      const result = resize(height);
      if (height === 4000 && generation === 0) {
        extent = 1000;
        generation = 1;
      }
      return result;
    });
    const result = await measureExpandedComposition(
      value.surface,
      value.resize,
      'home-mobile',
      'revision-1',
      new AbortController().signal,
      { width: 390, height: 844 },
    );
    expect(result.status).toBe('settled');
    expect(result.viewport.height).toBe(1000);
  });
  it('does not settle a restored runtime under the previous document identity', async () => {
    const value = preview(() => 4000);
    value.resize.mockImplementationOnce(() => {
      value.surface.measureLayout.mockResolvedValue({
        documentId: 'composition-document',
        documentInstanceId: 'restored-instance',
        localEdits: { generation: 0, active: false, changed: false },
        viewport: { width: 390, height: 4000, scrollX: 0, scrollY: 0 },
        document: { width: 390, height: 4000 },
      });
      return Promise.resolve();
    });
    await expect(measure(value)).rejects.toThrow('changed');
  });
  it('requires two observations at the expanded viewport before reporting settled geometry', async () => {
    const value = preview(() => 4000);
    const result = await measure(value);
    expect(result.status).toBe('settled');
    expect(result.configuredViewport).toEqual({ width: 390, height: 844 });
    expect(result.viewport.height).toBe(4000);
    expect(result.document.height).toBe(4000);
    expect(result.documentId).toBe('composition-document');
    expect(result.frameId).toBe('home-mobile');
    expect(result.revision).toBe('revision-1');
    expect(result.measurements.map((item) => item.viewport.height)).toEqual([844, 4000, 4000]);
    expect(result.warnings.join(' ')).toContain('device');
  });

  it('bounds viewport-dependent growth and never labels a nonconverging page settled', async () => {
    const value = preview((height) => height + 100);
    const result = await measure(value);
    expect(result.status).toBe('round-limit');
    expect(result.measurements).toHaveLength(EXPANDED_COMPOSITION_LIMITS.maxRounds);
    expect(result.document.height).toBeGreaterThan(result.viewport.height);
    expect(result.warnings.join(' ')).toContain('not settled');
  });

  it('caps the actual composition viewport and reports the remaining document extent', async () => {
    const value = preview(() => 100_000);
    const result = await measure(value);
    expect(result.status).toBe('height-limit');
    expect(result.viewport.height).toBe(EXPANDED_COMPOSITION_LIMITS.maxHeight);
    expect(result.document.height).toBe(100_000);
    expect(result.warnings.join(' ')).toContain('truncated');
    expect(
      value.resize.mock.calls.every(([height]) => height <= EXPANDED_COMPOSITION_LIMITS.maxHeight),
    ).toBe(true);
  });

  it('rejects a replacement document even when its viewport and extent match', async () => {
    const value = preview(() => 4000);
    value.resize.mockImplementationOnce(() => {
      value.surface.measureLayout.mockResolvedValue({
        documentId: 'replacement-document',
        documentInstanceId: 'replacement-instance',
        localEdits: { generation: 0, active: false, changed: false },
        viewport: { width: 390, height: 4000, scrollX: 0, scrollY: 0 },
        document: { width: 390, height: 4000 },
      });
      return Promise.resolve();
    });
    await expect(measure(value)).rejects.toThrow('changed');
  });

  it('does not resize after cancelled measurement work ignores its signal', async () => {
    const value = preview(() => 4000);
    const controller = new AbortController();
    value.surface.measureLayout.mockImplementationOnce(() => {
      controller.abort();
      return Promise.resolve({
        documentId: 'composition-document',
        documentInstanceId: 'composition-instance',
        localEdits: { generation: 0, active: false, changed: false },
        viewport: { width: 390, height: 844, scrollX: 0, scrollY: 0 },
        document: { width: 390, height: 4000 },
      });
    });
    await expect(measure(value, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(value.resize).not.toHaveBeenCalled();
  });

  it('bounds elapsed time even if the measurement bridge never answers', async () => {
    vi.useFakeTimers();
    try {
      const value = preview(() => 4000);
      value.surface.measureLayout.mockImplementation(() => new Promise(() => {}));
      const pending = expect(measure(value)).rejects.toMatchObject({ name: 'TimeoutError' });
      await vi.advanceTimersByTimeAsync(EXPANDED_COMPOSITION_LIMITS.maxDuration);
      await pending;
      expect(value.resize).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects elapsed-budget work even when the deadline callback has not run yet', async () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(0);
    try {
      const value = preview(() => 4000);
      const resize = value.resize.getMockImplementation()!;
      value.resize.mockImplementationOnce((height) => {
        clock.mockReturnValue(EXPANDED_COMPOSITION_LIMITS.maxDuration + 1);
        return resize(height);
      });
      await expect(measure(value)).rejects.toMatchObject({ name: 'TimeoutError' });
      expect(value.surface.measureLayout).toHaveBeenCalledTimes(1);
    } finally {
      clock.mockRestore();
    }
  });
});
