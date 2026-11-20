import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  IDLE_INTERVAL_MS,
  UNSUPPORTED_RETRY_MS,
  startActivityPoller,
  type PauseReason,
} from './activity-poller';

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
}

describe('activity poller', () => {
  let stop: (() => void) | undefined;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    setHidden(false);
  });
  afterEach(() => {
    stop?.();
    stop = undefined;
    vi.useRealTimers();
  });

  it('polls every 10 s with input, every 30 s without, and stops after 30 idle minutes', async () => {
    const poll = vi.fn().mockResolvedValue(true);
    const onPause = vi.fn<(reason: PauseReason) => void>();
    ({ stop } = startActivityPoller({ poll, onPause }));
    expect(poll).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(poll).toHaveBeenCalledTimes(7);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(poll).toHaveBeenCalledTimes(11);
    await vi.advanceTimersByTimeAsync(30 * 60_000);
    const atStop = poll.mock.calls.length;
    expect(onPause).toHaveBeenCalledWith('idle');
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(poll).toHaveBeenCalledTimes(atStop);
    document.dispatchEvent(new Event('keydown'));
    expect(poll).toHaveBeenCalledTimes(atStop + 1);
  });

  it('returns to the 10 s cadence once the pending idle interval has run', async () => {
    const poll = vi.fn().mockResolvedValue(true);
    ({ stop } = startActivityPoller({ poll, onPause: vi.fn() }));
    await vi.advanceTimersByTimeAsync(90_000);
    expect(poll).toHaveBeenCalledTimes(8);
    document.dispatchEvent(new Event('pointerdown'));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(poll).toHaveBeenCalledTimes(9);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(poll).toHaveBeenCalledTimes(11);
  });

  it('makes no requests while hidden, pauses on hide and resumes at once when visible', async () => {
    setHidden(true);
    const poll = vi.fn().mockResolvedValue(true);
    const onPause = vi.fn<(reason: PauseReason) => void>();
    ({ stop } = startActivityPoller({ poll, onPause }));
    await vi.advanceTimersByTimeAsync(120_000);
    expect(poll).not.toHaveBeenCalled();
    setHidden(false);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(poll).toHaveBeenCalledTimes(1);
    setHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(onPause).toHaveBeenCalledWith('hidden');
    await vi.advanceTimersByTimeAsync(120_000);
    expect(poll).toHaveBeenCalledTimes(1);
  });

  it('backs off exponentially on failure, up to a minute, and recovers on success', async () => {
    const poll = vi
      .fn()
      .mockRejectedValueOnce(new Error('503'))
      .mockRejectedValueOnce(new Error('503'))
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValue(true);
    ({ stop } = startActivityPoller({ poll, onPause: vi.fn() }));
    await vi.advanceTimersByTimeAsync(19_999);
    expect(poll).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(poll).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(40_000);
    expect(poll).toHaveBeenCalledTimes(3);
    // Idle cadence by now: 30 s × 2^3 is capped at 60 s.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(poll).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(poll).toHaveBeenCalledTimes(5);
  });

  it('pauses when the endpoint is missing and asks again only after five minutes', async () => {
    const poll = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    const onPause = vi.fn<(reason: PauseReason) => void>();
    ({ stop } = startActivityPoller({ poll, onPause }));
    await vi.advanceTimersByTimeAsync(0);
    expect(onPause).toHaveBeenCalledWith('unsupported');
    document.dispatchEvent(new Event('keydown'));
    await vi.advanceTimersByTimeAsync(UNSUPPORTED_RETRY_MS - 1);
    expect(poll).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(poll).toHaveBeenCalledTimes(2);
    // Served now, so the normal cadence is back; the last input was five minutes ago.
    await vi.advanceTimersByTimeAsync(IDLE_INTERVAL_MS);
    expect(poll).toHaveBeenCalledTimes(3);
  });

  it('does not ask a missing endpoint again while the tab is hidden, and asks on return', async () => {
    const poll = vi.fn().mockResolvedValue(false);
    ({ stop } = startActivityPoller({ poll, onPause: vi.fn() }));
    await vi.advanceTimersByTimeAsync(0);
    setHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(UNSUPPORTED_RETRY_MS * 2);
    expect(poll).toHaveBeenCalledTimes(1);
    setHidden(false);
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(poll).toHaveBeenCalledTimes(2);
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
    ({ stop } = startActivityPoller({ poll, onPause: vi.fn() }));
    await vi.advanceTimersByTimeAsync(20_000);
    expect(poll).toHaveBeenCalledTimes(1);
    setHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(isCurrent()).toBe(false);
    setHidden(false);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(poll).toHaveBeenCalledTimes(1);
    expect(isCurrent()).toBe(false);
    finish(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(poll).toHaveBeenCalledTimes(2);
  });

  it('keeps polling at the idle cadence while hidden when asked to, and at once on return', async () => {
    const poll = vi.fn().mockResolvedValue(true);
    const onPause = vi.fn<(reason: PauseReason) => void>();
    ({ stop } = startActivityPoller({ poll, onPause, keepAliveWhileHidden: true }));
    await vi.advanceTimersByTimeAsync(0);
    expect(poll).toHaveBeenCalledTimes(1);
    setHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(onPause).not.toHaveBeenCalled();
    // The poll already due runs on the active interval; every one after it waits the idle one.
    await vi.advanceTimersByTimeAsync(10_000 + 2 * IDLE_INTERVAL_MS);
    expect(poll).toHaveBeenCalledTimes(4);
    setHidden(false);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(poll).toHaveBeenCalledTimes(5);
  });

  it('still stops a hidden tab after 30 idle minutes', async () => {
    const poll = vi.fn().mockResolvedValue(true);
    const onPause = vi.fn<(reason: PauseReason) => void>();
    ({ stop } = startActivityPoller({ poll, onPause, keepAliveWhileHidden: true }));
    setHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(31 * 60_000);
    expect(onPause).toHaveBeenCalledWith('idle');
    const atStop = poll.mock.calls.length;
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(poll).toHaveBeenCalledTimes(atStop);
  });

  it('gives its place up when the page is closed or reloaded, and polls again if it comes back', async () => {
    const poll = vi.fn().mockResolvedValue(true);
    const onPause = vi.fn<(reason: PauseReason) => void>();
    ({ stop } = startActivityPoller({ poll, onPause, keepAliveWhileHidden: true }));
    await vi.advanceTimersByTimeAsync(0);
    expect(poll).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event('pagehide'));
    expect(onPause).toHaveBeenCalledExactlyOnceWith('hidden');
    await vi.advanceTimersByTimeAsync(IDLE_INTERVAL_MS);
    expect(poll).toHaveBeenCalledTimes(1);
    // The back/forward cache can bring the same page back.
    window.dispatchEvent(new Event('pageshow'));
    expect(poll).toHaveBeenCalledTimes(2);
  });

  it('polls at once when asked, and straight after a request in flight', async () => {
    let finish: (served: boolean) => void = () => undefined;
    const poll = vi.fn().mockResolvedValue(true);
    const poller = startActivityPoller({ poll, onPause: vi.fn() });
    ({ stop } = poller);
    await vi.advanceTimersByTimeAsync(1_000);
    poller.pollNow();
    expect(poll).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(0);

    poll.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    );
    poller.pollNow();
    poller.pollNow();
    expect(poll).toHaveBeenCalledTimes(3);
    finish(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(poll).toHaveBeenCalledTimes(4);
    // Back on the ordinary interval afterwards.
    await vi.advanceTimersByTimeAsync(9_999);
    expect(poll).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(1);
    expect(poll).toHaveBeenCalledTimes(5);
  });

  it('removes listeners and timers on dispose and reports it once', async () => {
    const poll = vi.fn().mockResolvedValue(true);
    const onPause = vi.fn<(reason: PauseReason) => void>();
    const { stop: dispose } = startActivityPoller({ poll, onPause });
    dispose();
    dispose();
    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onPause).toHaveBeenCalledWith('disposed');
    document.dispatchEvent(new Event('keydown'));
    await vi.advanceTimersByTimeAsync(120_000);
    expect(poll).toHaveBeenCalledTimes(1);
  });
});
