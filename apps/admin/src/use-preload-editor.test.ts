import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { usePreloadEditor } from './use-preload-editor';

const { preloadEditor } = vi.hoisted(() => ({
  preloadEditor: vi.fn(),
}));

vi.mock('./editor/api', () => ({ preloadEditor }));

describe('usePreloadEditor', () => {
  let idle: Array<() => void>;
  const runIdleCallbacks = () => idle.splice(0).forEach((callback) => callback());

  beforeEach(() => {
    preloadEditor.mockReset();
    idle = [];
    vi.stubGlobal(
      'requestIdleCallback',
      vi.fn((callback: () => void) => idle.push(callback)),
    );
    vi.stubGlobal('cancelIdleCallback', vi.fn());
  });

  afterEach(() => {
    // Unmount first: the hook's cleanup cancels through the stubbed globals.
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('preloads the React editor once the signed-in shell is idle', () => {
    renderHook(() => usePreloadEditor(true));

    expect(preloadEditor).not.toHaveBeenCalled();
    runIdleCallbacks();
    expect(preloadEditor).toHaveBeenCalledTimes(1);
  });

  it('waits for sign-in before preloading', () => {
    const { rerender } = renderHook(({ signedIn }) => usePreloadEditor(signedIn), {
      initialProps: { signedIn: false },
    });
    runIdleCallbacks();
    expect(preloadEditor).not.toHaveBeenCalled();

    rerender({ signedIn: true });
    runIdleCallbacks();
    expect(preloadEditor).toHaveBeenCalledTimes(1);
  });

  it('falls back to a timer where requestIdleCallback is missing', () => {
    vi.unstubAllGlobals();
    vi.useFakeTimers();

    renderHook(() => usePreloadEditor(true));
    expect(preloadEditor).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(preloadEditor).toHaveBeenCalledTimes(1);
  });
});
