import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APIError, SessionExpiredError } from '@tryghost/admin-x-framework/errors';
import type { PresenceResource } from '@tryghost/admin-x-framework/api/presence';
import { LEASE_PENDING_MS, LEASE_STALE_MS, usePresence, usePresenceEnabled } from './use-presence';
import { useVisibleResources } from './use-visible-resources';

const mocks = vi.hoisted(() => {
  const poll =
    vi.fn<
      (
        resources: PresenceResource[],
        editing?: PresenceResource,
        lease?: 'hold' | 'take' | 'watch',
      ) => Promise<unknown>
    >();
  const leave = vi.fn<(resource: PresenceResource) => void>();
  // One object, as the real hook memoises its result.
  return { enabled: true, poll, leave, api: { poll, leave } };
});
vi.mock('@tryghost/admin-x-framework/hooks', () => ({
  useFeatureFlag: () => mocks.enabled,
}));
vi.mock('@tryghost/admin-x-framework/api/presence', () => ({
  usePresenceApi: () => mocks.api,
  presenceTabId: () => 'this-tab',
}));
/** The other tabs of the browser: what this tab told them, and a way to speak as one of them. */
const tabs = vi.hoisted(() => {
  const listening = new Set<(signal: unknown) => void>();
  const told: unknown[] = [];
  return { listening, told, say: (signal: unknown) => listening.forEach((hear) => hear(signal)) };
});
vi.mock('./lease-channel', () => ({
  openLeaseChannel: (onSignal: (signal: unknown) => void) => {
    tabs.listening.add(onSignal);
    return {
      post: (signal: unknown) => tabs.told.push(signal),
      close: () => tabs.listening.delete(onSignal),
    };
  },
}));

const resource: PresenceResource = { id: 'a'.repeat(24), type: 'post' };
const other = {
  userId: 'o'.repeat(24),
  resourceType: 'post' as const,
  resourceId: resource.id,
  ts: 0,
};

describe('usePresence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    mocks.enabled = true;
    mocks.poll.mockReset().mockResolvedValue({ presence: [{ active: [other], serverTime: 0 }] });
    mocks.leave.mockReset();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('sends nothing while the flag is off', async () => {
    mocks.enabled = false;
    const observer = vi.fn();
    vi.stubGlobal('IntersectionObserver', observer);
    const hook = renderHook(() => {
      const enabled = usePresenceEnabled();
      useVisibleResources({ current: null }, [resource], enabled);
      return usePresence([resource], resource);
    });
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(observer).not.toHaveBeenCalled();
    expect(mocks.poll).not.toHaveBeenCalled();
    expect(hook.result.current.active).toEqual([]);
    hook.unmount();
  });

  it('heartbeats the edited document and reports the others it gets back', async () => {
    const hook = renderHook(() => usePresence([resource], resource));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(hook.result.current.active).toEqual([other]);
    expect(mocks.poll).toHaveBeenCalledWith([resource], resource, undefined);
    expect(hook.result.current.lease).toBeNull();
    hook.unmount();
  });

  it('polls lists without editing', async () => {
    const hook = renderHook(() => usePresence([resource]));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(mocks.poll).toHaveBeenCalledWith([resource], undefined, undefined);
    hook.unmount();
  });

  it('ignores a malformed response', async () => {
    mocks.poll.mockResolvedValue({
      presence: [{ active: [{ ...other, ts: 'now' }], serverTime: 0 }],
    });
    const hook = renderHook(() => usePresence([resource]));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(hook.result.current.active).toEqual([]);
    hook.unmount();
  });

  it('asks an older backend once, again only after five minutes, and never sends leave', async () => {
    mocks.poll.mockRejectedValue(new APIError(new Response(null, { status: 404 })));
    const hook = renderHook(() => usePresence([resource], resource));
    await act(() => vi.advanceTimersByTimeAsync(120_000));
    expect(mocks.poll).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(180_000));
    expect(mocks.poll).toHaveBeenCalledTimes(2);
    hook.unmount();
    expect(mocks.leave).not.toHaveBeenCalled();
  });

  it('treats a 403 that is not an expired session as a missing endpoint', async () => {
    mocks.poll.mockRejectedValue(new APIError(new Response(null, { status: 403 })));
    const hook = renderHook(() => usePresence([resource], resource));
    await act(() => vi.advanceTimersByTimeAsync(120_000));
    expect(mocks.poll).toHaveBeenCalledTimes(1);
    hook.unmount();
    expect(mocks.leave).not.toHaveBeenCalled();
  });

  it('backs off on an expired session and resumes, since the editor re-authenticates in place', async () => {
    // Ghost answers an expired session with a 403, which the framework raises as this error.
    mocks.poll.mockRejectedValueOnce(
      new SessionExpiredError(new Response(null, { status: 403 }), {}),
    );
    const hook = renderHook(() => usePresence([resource], resource));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(hook.result.current.active).toEqual([]);
    await act(() => vi.advanceTimersByTimeAsync(19_999));
    expect(mocks.poll).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(mocks.poll).toHaveBeenCalledTimes(2);
    expect(hook.result.current.active).toEqual([other]);
    hook.unmount();
  });

  it('clears and backs off on a server failure, then polls the latest rows', async () => {
    mocks.poll.mockRejectedValueOnce(new APIError(new Response(null, { status: 503 })));
    const hook = renderHook(({ resources }) => usePresence(resources), {
      initialProps: { resources: [resource] },
    });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(hook.result.current.active).toEqual([]);
    const next = { ...resource, id: 'c'.repeat(24) };
    hook.rerender({ resources: [next] });
    await act(() => vi.advanceTimersByTimeAsync(19_999));
    expect(mocks.poll).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(mocks.poll).toHaveBeenCalledTimes(2);
    expect(mocks.poll).toHaveBeenLastCalledWith([next], undefined, undefined);
    hook.unmount();
  });

  it('keeps entries for rows outside the current poll until a poll covers them again', async () => {
    mocks.poll.mockImplementation(() =>
      Promise.resolve({ presence: [{ active: [], serverTime: Date.now() }] }),
    );
    mocks.poll.mockResolvedValueOnce({ presence: [{ active: [other], serverTime: 0 }] });
    const hook = renderHook(({ resources }) => usePresence(resources), {
      initialProps: { resources: [resource] },
    });
    await act(() => vi.advanceTimersByTimeAsync(0));
    hook.rerender({ resources: [{ ...resource, id: 'c'.repeat(24) }] });
    await act(() => vi.advanceTimersByTimeAsync(20_000));
    expect(hook.result.current.active).toEqual([other]);
    hook.rerender({ resources: [resource] });
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(hook.result.current.active).toEqual([]);
    hook.unmount();
  });

  it('sends leave and clears when the tab hides, and again when the route unmounts', async () => {
    const hook = renderHook(() => usePresence([resource], resource));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(hook.result.current.active).toEqual([other]);
    act(() => {
      Object.defineProperty(document, 'hidden', { value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(hook.result.current.active).toEqual([]);
    expect(mocks.leave).toHaveBeenCalledTimes(1);
    expect(mocks.leave).toHaveBeenCalledWith(resource);
    act(() => {
      Object.defineProperty(document, 'hidden', { value: false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    hook.unmount();
    expect(mocks.leave).toHaveBeenCalledTimes(2);
  });

  it('does not send leave for list polls', async () => {
    const hook = renderHook(() => usePresence([resource]));
    await act(() => vi.advanceTimersByTimeAsync(0));
    hook.unmount();
    expect(mocks.leave).not.toHaveBeenCalled();
  });
});

describe('usePresence lease', () => {
  /** `null` is a server that finds nobody holding the document; no argument is one that keeps no lease. */
  const answer = (lease?: { userId: string; mine: boolean } | null, serverTime = 0) => ({
    presence: [{ active: [], ...(lease === undefined ? {} : { lease }), serverTime }],
  });
  const holder = { userId: 'h'.repeat(24), mine: false };
  const mine = { userId: 'm'.repeat(24), mine: true };
  const withLease = (wants = false) =>
    renderHook(({ wantsLease }) => usePresence([resource], resource, { lease: true, wantsLease }), {
      initialProps: { wantsLease: wants },
    });
  const setHidden = (hidden: boolean) => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
    document.dispatchEvent(new Event('visibilitychange'));
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    mocks.enabled = true;
    mocks.poll.mockReset().mockResolvedValue(answer(mine));
    mocks.leave.mockReset();
    tabs.told.length = 0;
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('only watches while it has no work of its own, and reports who holds the document', async () => {
    mocks.poll.mockResolvedValue(answer(holder));
    const hook = withLease();
    expect(hook.result.current.lease).toBe('pending');
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(mocks.poll).toHaveBeenCalledWith([resource], resource, 'watch');
    expect(hook.result.current.lease).toEqual(holder);
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(mocks.poll).toHaveBeenLastCalledWith([resource], resource, 'watch');
    hook.unmount();
  });

  it('reports a document nobody holds as free', async () => {
    mocks.poll.mockResolvedValue(answer(null));
    const hook = withLease();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(hook.result.current.lease).toBe('free');
    hook.unmount();
  });

  it('asks for the lease at once when its work begins, and keeps asking while it holds it', async () => {
    mocks.poll.mockResolvedValue(answer(null));
    const hook = withLease();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(mocks.poll).toHaveBeenCalledTimes(1);

    mocks.poll.mockResolvedValue(answer(mine));
    await act(async () => {
      hook.rerender({ wantsLease: true });
      await vi.advanceTimersByTimeAsync(0);
    });
    // Not ten seconds later, with the poll that was due.
    expect(mocks.poll).toHaveBeenCalledTimes(2);
    expect(mocks.poll).toHaveBeenLastCalledWith([resource], resource, 'hold');
    expect(hook.result.current.lease).toEqual(mine);

    // Saved, so nothing of its own is left unsaved: it is still the one editing.
    hook.rerender({ wantsLease: false });
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(mocks.poll).toHaveBeenLastCalledWith([resource], resource, 'hold');
    hook.unmount();
  });

  it('does not ask again each time new work begins while it already holds the lease', async () => {
    const hook = withLease(true);
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(mocks.poll).toHaveBeenCalledTimes(1);
    hook.rerender({ wantsLease: false });
    await act(async () => {
      hook.rerender({ wantsLease: true });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mocks.poll).toHaveBeenCalledTimes(1);
    hook.unmount();
  });

  it('goes back to watching once it neither holds the lease nor wants it', async () => {
    mocks.poll.mockResolvedValue(answer(holder));
    const hook = withLease(true);
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(mocks.poll).toHaveBeenLastCalledWith([resource], resource, 'hold');
    expect(hook.result.current.lease).toEqual(holder);
    hook.rerender({ wantsLease: false });
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(mocks.poll).toHaveBeenLastCalledWith([resource], resource, 'watch');
    hook.unmount();
  });

  it('asks about no lease, and reports none, unless the caller follows one', async () => {
    const hook = renderHook(() => usePresence([resource], resource, { lease: false }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(mocks.poll).toHaveBeenCalledWith([resource], resource, undefined);
    expect(hook.result.current.lease).toBeNull();
    hook.unmount();
  });

  it('keeps its place while the tab is hidden, and asks at once on return', async () => {
    const hook = withLease(true);
    await act(() => vi.advanceTimersByTimeAsync(0));
    act(() => setHidden(true));
    expect(mocks.leave).not.toHaveBeenCalled();
    expect(hook.result.current.lease).toEqual(mine);
    await act(() => vi.advanceTimersByTimeAsync(40_000));
    expect(mocks.poll).toHaveBeenCalledTimes(3);
    mocks.poll.mockResolvedValue(answer(holder));
    await act(async () => {
      setHidden(false);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mocks.poll).toHaveBeenCalledTimes(4);
    expect(hook.result.current.lease).toEqual(holder);
    hook.unmount();
    expect(mocks.leave).toHaveBeenCalledTimes(1);
  });

  it('takes over with the next poll, sent at once, then goes back to holding', async () => {
    mocks.poll.mockResolvedValue(answer(holder));
    const hook = withLease();
    await act(() => vi.advanceTimersByTimeAsync(0));
    mocks.poll.mockResolvedValue(answer(mine, 5_000));
    await act(async () => {
      hook.result.current.takeOver();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mocks.poll).toHaveBeenLastCalledWith([resource], resource, 'take');
    expect(hook.result.current.lease).toEqual({ ...mine, takenAt: 5_000 });
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(mocks.poll).toHaveBeenLastCalledWith([resource], resource, 'hold');
    expect(hook.result.current.lease).toEqual({ ...mine, takenAt: 5_000 });
    hook.unmount();
  });

  describe('between tabs of one browser', () => {
    const LEASE = `post:${resource.id}`;
    const takeOver = async () => {
      mocks.poll.mockResolvedValue(answer(holder));
      const hook = withLease();
      await act(() => vi.advanceTimersByTimeAsync(0));
      mocks.poll.mockResolvedValue(answer(mine, 5_000));
      await act(async () => {
        hook.result.current.takeOver();
        await vi.advanceTimersByTimeAsync(0);
      });
      return hook;
    };
    const hears = (signal: object) =>
      act(async () => {
        tabs.say({ lease: LEASE, ...signal });
        await vi.advanceTimersByTimeAsync(0);
      });

    it('tells the other tabs once it has taken the lease over, and not before', async () => {
      mocks.poll.mockResolvedValue(answer(holder));
      const hook = withLease(true);
      await act(() => vi.advanceTimersByTimeAsync(0));
      expect(tabs.told).toEqual([]);
      hook.unmount();

      (await takeOver()).unmount();
      expect(tabs.told).toEqual([{ type: 'taken', lease: LEASE, from: 'this-tab' }]);
    });

    it('learns that the tab it took the lease from knows, from that tab’s answer to it', async () => {
      const hook = await takeOver();
      await hears({ type: 'heard', from: 'old-tab', to: 'some-other-tab' });
      expect(hook.result.current.lease).toEqual({ ...mine, takenAt: 5_000 });

      await hears({ type: 'heard', from: 'old-tab', to: 'this-tab' });
      expect(hook.result.current.lease).toEqual({ ...mine, takenAt: 5_000, heard: true });
      await act(() => vi.advanceTimersByTimeAsync(10_000));
      expect(hook.result.current.lease).toEqual({ ...mine, takenAt: 5_000, heard: true });
      hook.unmount();
    });

    it('asks at once when another tab says it took the lease, and answers once it reads that it lost it', async () => {
      const hook = withLease(true);
      await act(() => vi.advanceTimersByTimeAsync(0));
      expect(mocks.poll).toHaveBeenCalledTimes(1);

      mocks.poll.mockResolvedValue(answer(holder));
      await hears({ type: 'taken', from: 'new-tab' });
      expect(mocks.poll).toHaveBeenCalledTimes(2);
      expect(hook.result.current.lease).toEqual(holder);
      expect(tabs.told).toEqual([{ type: 'heard', lease: LEASE, from: 'this-tab', to: 'new-tab' }]);
      hook.unmount();
    });

    it('holds its answer while its own poll still says it holds the lease', async () => {
      const hook = withLease(true);
      await act(() => vi.advanceTimersByTimeAsync(0));
      // Its poll was answered before the takeover landed.
      await hears({ type: 'taken', from: 'new-tab' });
      expect(tabs.told).toEqual([]);

      mocks.poll.mockResolvedValue(answer(holder));
      await act(() => vi.advanceTimersByTimeAsync(10_000));
      expect(tabs.told).toEqual([{ type: 'heard', lease: LEASE, from: 'this-tab', to: 'new-tab' }]);
      hook.unmount();
    });

    it('does not answer for the holder when it was only watching', async () => {
      mocks.poll.mockResolvedValue(answer(holder));
      const hook = withLease();
      await act(() => vi.advanceTimersByTimeAsync(0));
      await hears({ type: 'taken', from: 'new-tab' });
      // It asks, to show the new holder at once, and has nothing to say.
      expect(mocks.poll).toHaveBeenCalledTimes(2);
      expect(tabs.told).toEqual([]);
      hook.unmount();
    });

    it('takes no notice of another document’s takeover', async () => {
      const hook = withLease(true);
      await act(() => vi.advanceTimersByTimeAsync(0));
      await hears({ type: 'taken', lease: `post:${'b'.repeat(24)}`, from: 'new-tab' });
      expect(mocks.poll).toHaveBeenCalledTimes(1);
      hook.unmount();
    });
  });

  it('opens for editing when the first answer does not come', async () => {
    mocks.poll.mockRejectedValue(new APIError(new Response(null, { status: 503 })));
    const hook = withLease();
    await act(() => vi.advanceTimersByTimeAsync(LEASE_PENDING_MS - 1));
    expect(hook.result.current.lease).toBe('pending');
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(hook.result.current.lease).toBeNull();
    hook.unmount();
  });

  it('keeps the last answer through a short failure and drops it after a long one', async () => {
    mocks.poll.mockResolvedValueOnce(answer(holder));
    mocks.poll.mockRejectedValue(new APIError(new Response(null, { status: 503 })));
    const hook = withLease();
    await act(() => vi.advanceTimersByTimeAsync(0));
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(hook.result.current.lease).toEqual(holder);
    await act(() => vi.advanceTimersByTimeAsync(LEASE_STALE_MS));
    expect(hook.result.current.lease).toBeNull();
    mocks.poll.mockResolvedValue(answer(holder));
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(hook.result.current.lease).toEqual(holder);
    hook.unmount();
  });

  it('stops asking a server that refuses the field, and keeps presence going', async () => {
    mocks.poll.mockRejectedValueOnce(new APIError(new Response(null, { status: 422 })));
    mocks.poll.mockResolvedValue({ presence: [{ active: [other], serverTime: 0 }] });
    const hook = withLease();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(mocks.poll.mock.calls.map((call) => call[2])).toEqual(['watch', undefined]);
    expect(hook.result.current.lease).toBeNull();
    expect(hook.result.current.active).toEqual([other]);
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(mocks.poll).toHaveBeenLastCalledWith([resource], resource, undefined);
    hook.unmount();
  });

  it('goes on reporting no lease after idleness when the server has refused the field', async () => {
    mocks.poll.mockRejectedValueOnce(new APIError(new Response(null, { status: 422 })));
    mocks.poll.mockResolvedValue({ presence: [{ active: [other], serverTime: 0 }] });
    const hook = withLease();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(hook.result.current.lease).toBeNull();

    // No answer about the lease will ever come, so there is none to wait for.
    await act(() => vi.advanceTimersByTimeAsync(31 * 60_000));
    expect(mocks.leave).toHaveBeenCalledTimes(1);
    expect(hook.result.current.lease).toBeNull();
    await act(async () => {
      document.dispatchEvent(new Event('keydown'));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mocks.poll).toHaveBeenLastCalledWith([resource], resource, undefined);
    expect(hook.result.current.lease).toBeNull();
    hook.unmount();
  });

  it('reports no lease when the server keeps none, and waits again once polling stops for idleness', async () => {
    mocks.poll.mockResolvedValue(answer());
    const hook = withLease();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(hook.result.current.lease).toBeNull();
    mocks.poll.mockResolvedValue(answer(mine));
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(hook.result.current.lease).toEqual(mine);
    await act(() => vi.advanceTimersByTimeAsync(31 * 60_000));
    expect(mocks.leave).toHaveBeenCalledTimes(1);
    expect(hook.result.current.lease).toBe('pending');
    await act(async () => {
      document.dispatchEvent(new Event('keydown'));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(hook.result.current.lease).toEqual(mine);
    hook.unmount();
  });
});
