import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { readSharedNow, retainMinuteTicker, subscribeSharedNow } from './minute-ticker';

describe('minute ticker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('refreshes the reading and starts ticking on first retention', () => {
    vi.setSystemTime(new Date('2026-09-10T12:00:00Z'));

    const release = retainMinuteTicker();

    expect(readSharedNow()).toBe(new Date('2026-09-10T12:00:00Z').getTime());
    expect(vi.getTimerCount()).toBe(1);

    release();
  });

  test('notifies subscribers on each tick while retained', () => {
    const release = retainMinuteTicker();
    const listener = vi.fn();
    const unsubscribe = subscribeSharedNow(listener);
    const start = readSharedNow();

    vi.advanceTimersByTime(120_000);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(readSharedNow()).toBe(start + 120_000);

    unsubscribe();
    release();
  });

  test('stops notifying an unsubscribed listener', () => {
    const release = retainMinuteTicker();
    const listener = vi.fn();
    subscribeSharedNow(listener)();

    vi.advanceTimersByTime(60_000);

    expect(listener).not.toHaveBeenCalled();
    release();
  });

  test('runs one interval however many consumers retain it', () => {
    const releaseFirst = retainMinuteTicker();
    const releaseSecond = retainMinuteTicker();
    expect(vi.getTimerCount()).toBe(1);

    releaseFirst();
    expect(vi.getTimerCount()).toBe(1);

    releaseSecond();
    expect(vi.getTimerCount()).toBe(0);
  });

  test('a double release cannot stop a later retention', () => {
    const releaseFirst = retainMinuteTicker();
    releaseFirst();
    releaseFirst();

    const releaseSecond = retainMinuteTicker();
    expect(vi.getTimerCount()).toBe(1);

    releaseSecond();
    expect(vi.getTimerCount()).toBe(0);
  });
});
