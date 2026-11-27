import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMinimumDuration } from './use-minimum-duration';

const MINIMUM = 1500;

/** Tracks whether a pending `elapsed()` has settled. */
function track(promise: Promise<void>) {
  const tracked = { settled: false };
  void promise.then(() => {
    tracked.settled = true;
  });
  return tracked;
}

async function advance(ms: number) {
  await act(() => vi.advanceTimersByTimeAsync(ms));
}

describe('useMinimumDuration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('settles at once when it was never started', async () => {
    const { result } = renderHook(() => useMinimumDuration(MINIMUM));

    await expect(result.current.elapsed()).resolves.toBeUndefined();
  });

  it('settles once the minimum has passed since it started', async () => {
    const { result } = renderHook(() => useMinimumDuration(MINIMUM));
    result.current.start();
    const elapsed = track(result.current.elapsed());

    await advance(MINIMUM - 1);
    expect(elapsed.settled).toBe(false);

    await advance(1);
    expect(elapsed.settled).toBe(true);
  });

  it('counts time spent before waiting towards the minimum', async () => {
    const { result } = renderHook(() => useMinimumDuration(MINIMUM));
    result.current.start();
    await advance(1000);
    const elapsed = track(result.current.elapsed());

    await advance(MINIMUM - 1001);
    expect(elapsed.settled).toBe(false);

    await advance(1);
    expect(elapsed.settled).toBe(true);
  });

  it('settles at once when the minimum has already passed', async () => {
    const { result } = renderHook(() => useMinimumDuration(MINIMUM));
    result.current.start();
    await advance(MINIMUM + 500);

    await expect(result.current.elapsed()).resolves.toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('restarts the minimum on each start', async () => {
    const { result } = renderHook(() => useMinimumDuration(MINIMUM));
    result.current.start();
    await advance(MINIMUM);
    result.current.start();
    const elapsed = track(result.current.elapsed());

    await advance(MINIMUM - 1);
    expect(elapsed.settled).toBe(false);

    await advance(1);
    expect(elapsed.settled).toBe(true);
  });

  it('holds a pending wait until a restarted minimum has passed', async () => {
    const { result } = renderHook(() => useMinimumDuration(MINIMUM));
    result.current.start();
    const elapsed = track(result.current.elapsed());
    await advance(1000);

    result.current.start();
    await advance(MINIMUM - 1);
    expect(elapsed.settled).toBe(false);

    await advance(1);
    expect(elapsed.settled).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('settles pending waits and clears their timers on unmount', async () => {
    const { result, unmount } = renderHook(() => useMinimumDuration(MINIMUM));
    result.current.start();
    const elapsed = track(result.current.elapsed());

    unmount();
    await act(() => Promise.resolve());

    expect(elapsed.settled).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('settles at once without a timer when waited on after unmount', async () => {
    const { result, unmount } = renderHook(() => useMinimumDuration(MINIMUM));
    const { start, elapsed } = result.current;
    start();
    unmount();

    start();
    await expect(elapsed()).resolves.toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });
});
