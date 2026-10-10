import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { preloadComponent, useLazyComponent } from './use-lazy-component';

afterEach(cleanup);

describe('useLazyComponent', () => {
  it('returns the preloaded screen on the first render without loading it again', async () => {
    const Screen = () => null;
    const load = vi.fn().mockResolvedValue({ default: Screen });
    await preloadComponent(load);

    const { result } = renderHook(() => useLazyComponent(load));

    expect(result.current).toBe(Screen);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('returns a loading state until a screen that was not preloaded arrives', async () => {
    const Screen = () => null;
    let resolve!: (module: { default: typeof Screen }) => void;
    const pending = new Promise<{ default: typeof Screen }>((done) => {
      resolve = done;
    });
    const load = () => pending;
    const { result } = renderHook(() => useLazyComponent(load));

    expect(result.current).toBeNull();
    await act(async () => {
      resolve({ default: Screen });
      await pending;
    });
    expect(result.current).toBe(Screen);
  });

  it('leaves a failed preload for the mounted screen to load again', async () => {
    const Screen = () => null;
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce({ default: Screen });
    await expect(preloadComponent(load)).rejects.toThrow('Offline');

    const { result } = renderHook(() => useLazyComponent(load));
    expect(result.current).toBeNull();
    await act(async () => {});

    expect(result.current).toBe(Screen);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
