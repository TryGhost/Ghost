import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startActivityPoller } from './activity-poller';

describe('activity-gated presence requests', () => {
  let stop: (() => void) | undefined;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });
  afterEach(() => {
    stop?.();
    vi.useRealTimers();
  });

  it('polls immediately, stops at one minute idle, and resumes on interaction', async () => {
    const poll = vi.fn().mockResolvedValue(true);
    stop = startActivityPoller({ poll, clear: vi.fn() });
    await vi.advanceTimersByTimeAsync(60000);
    expect(poll).toHaveBeenCalledTimes(6);
    await vi.advanceTimersByTimeAsync(300000);
    expect(poll).toHaveBeenCalledTimes(6);
    document.dispatchEvent(new Event('keydown'));
    expect(poll).toHaveBeenCalledTimes(7);
  });

  it('makes no requests while hidden and resumes immediately when visible', async () => {
    Object.defineProperty(document, 'hidden', { value: true });
    const poll = vi.fn().mockResolvedValue(true);
    stop = startActivityPoller({ poll, clear: vi.fn() });
    await vi.advanceTimersByTimeAsync(120000);
    expect(poll).not.toHaveBeenCalled();
    Object.defineProperty(document, 'hidden', { value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(poll).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, 'hidden', { value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(120000);
    expect(poll).toHaveBeenCalledTimes(1);
  });

  it('ignores a late response after hiding and never overlaps requests', async () => {
    let finish!: (value: boolean) => void;
    let isCurrent!: () => boolean;
    const poll = vi.fn((current: () => boolean) => {
      isCurrent = current;
      return new Promise<boolean>((resolve) => {
        finish = resolve;
      });
    });
    stop = startActivityPoller({ poll, clear: vi.fn() });
    await vi.advanceTimersByTimeAsync(20000);
    expect(poll).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, 'hidden', { value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(isCurrent()).toBe(false);
    Object.defineProperty(document, 'hidden', { value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(poll).toHaveBeenCalledTimes(1);
    expect(isCurrent()).toBe(false);
    finish(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(poll).toHaveBeenCalledTimes(2);
  });

  it('backs off failures and stops permanently for unsupported endpoints', async () => {
    const poll = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(false);
    stop = startActivityPoller({ poll, clear: vi.fn() });
    await vi.advanceTimersByTimeAsync(10000);
    expect(poll).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10000);
    expect(poll).toHaveBeenCalledTimes(2);
    document.dispatchEvent(new Event('keydown'));
    await vi.advanceTimersByTimeAsync(120000);
    expect(poll).toHaveBeenCalledTimes(2);
  });

  it('removes listeners and timers when the route unmounts', async () => {
    const poll = vi.fn().mockResolvedValue(true);
    stop = startActivityPoller({ poll, clear: vi.fn() });
    stop();
    document.dispatchEvent(new Event('keydown'));
    await vi.advanceTimersByTimeAsync(120000);
    expect(poll).toHaveBeenCalledTimes(1);
  });

  it('does not clear a replacement route when an old request fails after disposal', async () => {
    let finish!: (value: boolean) => void;
    const clear = vi.fn();
    stop = startActivityPoller({
      poll: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
      clear,
    });
    stop();
    clear.mockClear();
    finish(false);
    await vi.advanceTimersByTimeAsync(0);
    expect(clear).not.toHaveBeenCalled();
  });
});
